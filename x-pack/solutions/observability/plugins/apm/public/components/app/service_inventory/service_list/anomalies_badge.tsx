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
import { ML_ANOMALY_SEVERITY } from '@kbn/ml-anomaly-utils/anomaly_severity';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import { isMobileAgentName } from '../../../../../common/agent_name';
import {
  getApmMlDetectorLabel,
  getSeverity,
  getSeverityColor,
} from '../../../../../common/anomaly_detection';
import { APM_APP_LOCATOR_ID } from '../../../../locator/service_detail_locator';

export function getI18nLabel(severity: ML_ANOMALY_SEVERITY): string {
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

export function formatLabelWithScore(label: string, score?: number): string {
  if (score === undefined) return label;
  return `${label} (${Math.round(score)})`;
}

export const anomaliesBadgeCss = css`
  align-items: center;
`;

export const anomaliesBadgeHealthCss = css`
  line-height: inherit;
  display: flex;
  align-items: center;
`;

export function getAnomalyTooltipContent({
  score,
  detectorType,
  isInteractive,
}: {
  score: number | undefined;
  detectorType: AnomalyDetectorType | undefined;
  isInteractive: boolean;
}): string {
  if (score === undefined) {
    return i18n.translate('xpack.apm.anomaliesBadge.tooltip.unknown', {
      defaultMessage: 'No anomaly score is available for the selected time range.',
    });
  }
  return i18n.translate('xpack.apm.anomaliesBadge.tooltip.score', {
    defaultMessage:
      'Anomaly score (max.): {score}{detectorType, select, none {} other { - {detectorLabel}}}{hasHref, select, true { - Click to view more.} other {}}',
    values: {
      score: score.toFixed(2),
      detectorType: detectorType ?? 'none',
      detectorLabel: detectorType !== undefined ? getApmMlDetectorLabel(detectorType) : '',
      hasHref: isInteractive ? 'true' : 'false',
    },
  });
}

export interface AnomaliesBadgeNavigationProps {
  serviceName: string;
  agentName: AgentName;
  anomalyEnvironment: Environment;
  rangeFrom: string;
  rangeTo: string;
  locators: SharePluginStart['url']['locators'];
  transactionType?: string;
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
  const severity = getSeverity(score);
  const text = formatLabelWithScore(getI18nLabel(severity), score);

  const href =
    navigationProps && score !== undefined
      ? navigationProps.locators.get(APM_APP_LOCATOR_ID)?.getRedirectUrl({
          serviceName: navigationProps.serviceName,
          isMobileAgentName: isMobileAgentName(navigationProps.agentName),
          query: {
            environment: navigationProps.anomalyEnvironment,
            rangeFrom: navigationProps.rangeFrom,
            rangeTo: navigationProps.rangeTo,
            kuery: '',
            transactionType: navigationProps.transactionType,
            anomalyThreshold: severity === ML_ANOMALY_SEVERITY.UNKNOWN ? undefined : severity,
            comparisonEnabled: true,
            offset: 'expected_bounds',
          },
        })
      : undefined;

  const tooltipContent = getAnomalyTooltipContent({ score, detectorType, isInteractive: !!href });
  const roleProps = href ? { href } : { role: 'img' as const, 'aria-label': text };

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
