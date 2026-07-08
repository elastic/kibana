/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiBadge, EuiHealth, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { AnomalyDetectorType, Environment } from '@kbn/apm-types';
import type { AgentName } from '@kbn/elastic-agent-utils';
import type { TypeOf } from '@kbn/typed-react-router-config';
import { ML_ANOMALY_SEVERITY } from '@kbn/ml-anomaly-utils/anomaly_severity';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { isMobileAgentName } from '../../../../../common/agent_name';
import {
  getApmMlDetectorLabel,
  getSeverity,
  getSeverityColor,
} from '../../../../../common/anomaly_detection';
import { APM_APP_LOCATOR_ID } from '../../../../locator/service_detail_locator';
import type { ApmRoutes } from '../../../routing/apm_route_config';
import type { ApmPluginStartDeps } from '../../../../plugin';

function getI18nLabel(severity: ML_ANOMALY_SEVERITY): string {
  switch (severity) {
    case ML_ANOMALY_SEVERITY.CRITICAL:
      return i18n.translate('xpack.apm.anomaliesBadge.label.critical', {
        defaultMessage: 'Critical',
      });
    case ML_ANOMALY_SEVERITY.MAJOR:
      return i18n.translate('xpack.apm.anomaliesBadge.label.major', {
        defaultMessage: 'Major',
      });
    case ML_ANOMALY_SEVERITY.MINOR:
      return i18n.translate('xpack.apm.anomaliesBadge.label.minor', {
        defaultMessage: 'Minor',
      });
    case ML_ANOMALY_SEVERITY.WARNING:
      return i18n.translate('xpack.apm.anomaliesBadge.label.warning', {
        defaultMessage: 'Warning',
      });
    case ML_ANOMALY_SEVERITY.LOW:
      return i18n.translate('xpack.apm.anomaliesBadge.label.low', {
        defaultMessage: 'Low',
      });
    case ML_ANOMALY_SEVERITY.UNKNOWN:
      return i18n.translate('xpack.apm.anomaliesBadge.label.unknown', {
        defaultMessage: 'Unknown',
      });
  }
}

function formatLabelWithScore(label: string, score?: number): string {
  if (score === undefined) return label;
  return `${label} (${Math.round(score)})`;
}

const anomaliesBadgeCss = css`
  align-items: center;
`;

const anomaliesBadgeHealthCss = css`
  line-height: inherit;
  display: flex;
  align-items: center;
`;

type OverviewQuery = TypeOf<ApmRoutes, '/services/{serviceName}/overview'>['query'];

function toAnomalyOverviewQuery(
  query: OverviewQuery,
  severity: ML_ANOMALY_SEVERITY,
  anomalyEnvironment: Environment
): OverviewQuery {
  return {
    ...query,
    kuery: '',
    anomalyThreshold: severity === ML_ANOMALY_SEVERITY.UNKNOWN ? undefined : severity,
    environment: anomalyEnvironment,
    comparisonEnabled: true,
    offset: 'expected_bounds',
  };
}

export interface AnomaliesBadgeNavigationProps {
  serviceName: string;
  agentName: AgentName;
  anomalyEnvironment: Environment;
  /**
   * Ambient query from the consumer's own route context (rangeFrom/rangeTo/
   * environment/etc).
   */
  query: OverviewQuery;
}

interface AnomaliesBadgeProps {
  score: number | undefined;
  detectorType: AnomalyDetectorType | undefined;
  /**
   * When provided, enables interaction with the badge (clicking navigates to the service overview page with the anomaly score highlighted).
   * It is ignored if the score is undefined, in which case the badge is always non-interactive.
   */
  navigationProps?: AnomaliesBadgeNavigationProps;
}

export function AnomaliesBadge({ score, detectorType, navigationProps }: AnomaliesBadgeProps) {
  const { services } = useKibana<ApmPluginStartDeps>();
  const locator = services.share?.url.locators.get(APM_APP_LOCATOR_ID);

  const severity = getSeverity(score);
  const text = formatLabelWithScore(getI18nLabel(severity), score);

  const href =
    navigationProps && score !== undefined
      ? locator?.getRedirectUrl({
          serviceName: navigationProps.serviceName,
          isMobileAgentName: isMobileAgentName(navigationProps.agentName),
          query: toAnomalyOverviewQuery(
            navigationProps.query,
            severity,
            navigationProps.anomalyEnvironment
          ),
        })
      : undefined;

  const tooltipContent =
    score === undefined
      ? i18n.translate('xpack.apm.anomaliesBadge.tooltip.unknown', {
          defaultMessage: 'No anomaly score is available for the selected time range.',
        })
      : i18n.translate('xpack.apm.anomaliesBadge.tooltip.score', {
          defaultMessage:
            'Anomaly score (max.): {score}{detectorType, select, none {} other { - {detectorLabel}}}{hasHref, select, true { - Click to view more.} other {}}',
          values: {
            score: score.toFixed(2),
            detectorType: detectorType ?? 'none',
            detectorLabel: detectorType !== undefined ? getApmMlDetectorLabel(detectorType) : '',
            hasHref: href !== undefined ? 'true' : 'false',
          },
        });

  const roleProps = href ? { href } : { role: 'img', 'aria-label': text };

  return (
    <EuiToolTip position="bottom" content={tooltipContent}>
      <EuiBadge
        tabIndex={0}
        color="hollow"
        css={anomaliesBadgeCss}
        data-test-subj="apmAnomaliesBadge"
        {...roleProps}
      >
        <EuiHealth
          textSize="inherit"
          color={score === undefined ? 'subdued' : getSeverityColor(score)}
          css={anomaliesBadgeHealthCss}
        >
          {text}
        </EuiHealth>
      </EuiBadge>
    </EuiToolTip>
  );
}
