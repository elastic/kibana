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
import type { EbtClickAttrs } from '@kbn/ebt-click';
import { getEbtProps } from '@kbn/ebt-click';
import { ML_ANOMALY_SEVERITY } from '@kbn/ml-anomaly-utils/anomaly_severity';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import { isMobileAgentName } from '../../../../../common/agent_name';
import {
  getApmMlDetectorLabel,
  getSeverity,
  getSeverityColor,
  isNoAnomalyScore,
} from '../../../../../common/anomaly_detection';
import { APM_APP_LOCATOR_ID } from '../../../../locator/service_detail_locator';

const COMPARISON_ENABLED_DEFAULT = true;
const IS_IN_SERVICE_OVERVIEW_DEFAULT = false;

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

function getTooltipContent({
  isNone,
  score,
  detectorType,
  href,
  comparisonEnabled = COMPARISON_ENABLED_DEFAULT,
  isInServiceOverview = IS_IN_SERVICE_OVERVIEW_DEFAULT,
}: {
  isNone: boolean;
  score: number | undefined;
  detectorType: AnomalyDetectorType | undefined;
  href: string | undefined;
  comparisonEnabled: boolean | undefined;
  isInServiceOverview: boolean | undefined;
}): string {
  if (score === undefined) {
    return i18n.translate('xpack.apm.anomaliesBadge.tooltip.unknown', {
      defaultMessage: 'No anomaly score is available for the selected time range.',
    });
  }

  if (isNone) {
    return i18n.translate('xpack.apm.anomaliesBadge.tooltip.none', {
      defaultMessage: 'No anomalies detected.',
    });
  }

  if (href === undefined) {
    return i18n.translate('xpack.apm.anomaliesBadge.tooltip.score.noLink', {
      defaultMessage:
        'Anomaly score (max.): {score}{detectorType, select, none {} other { - {detectorLabel}}}',
      values: {
        score: score.toFixed(2),
        detectorType: detectorType ?? 'none',
        detectorLabel: detectorType !== undefined ? getApmMlDetectorLabel(detectorType) : '',
      },
    });
  }

  if (!isInServiceOverview) {
    return i18n.translate('xpack.apm.anomaliesBadge.tooltip.score.outsideLink', {
      defaultMessage:
        'Anomaly score (max.): {score}{detectorType, select, none {} other { - {detectorLabel}}} - Click to view more.',
      values: {
        score: score.toFixed(2),
        detectorType: detectorType ?? 'none',
        detectorLabel: detectorType !== undefined ? getApmMlDetectorLabel(detectorType) : '',
      },
    });
  }

  return i18n.translate('xpack.apm.anomaliesBadge.tooltip.score', {
    defaultMessage:
      'Anomaly score (max.): {score}{detectorType, select, none {} other { - {detectorLabel}}}{comparisonEnabled, select, true { - Click to view expected bounds.} other { - Click to hide expected bounds.}}',
    values: {
      score: score.toFixed(2),
      detectorType: detectorType ?? 'none',
      detectorLabel: detectorType !== undefined ? getApmMlDetectorLabel(detectorType) : '',
      comparisonEnabled: comparisonEnabled ? 'true' : 'false',
    },
  });
}

const anomaliesBadgeCss = css`
  align-items: center;
`;

const anomaliesBadgeHealthCss = css`
  line-height: inherit;
  display: flex;
  align-items: center;
`;

export interface AnomaliesBadgeNavigationProps {
  serviceName: string;
  agentName: AgentName;
  anomalyEnvironment: Environment;
  rangeFrom: string;
  rangeTo: string;
  locators: SharePluginStart['url']['locators'];
  transactionType?: string;
  comparisonEnabled?: boolean;
  /**
   * Tooltip content is slightly different when the badge is shown in the service overview page vs. other pages.
   * The prop is provided by consumers to avoid a direct dependency to `useApmParams` in this component,
   * which would make it less reusable in other pages.
   */
  isInServiceOverview?: boolean;
}

interface AnomaliesBadgeProps {
  score: number | undefined;
  detectorType: AnomalyDetectorType | undefined;
  /**
   * When provided, enables interaction with the badge (clicking navigates to the service overview page with the anomaly score highlighted).
   * It is ignored if the score is undefined, in which case the badge is always non-interactive.
   */
  navigationProps?: AnomaliesBadgeNavigationProps;
  ebt?: Omit<EbtClickAttrs, 'detail'>;
}

export function AnomaliesBadge({ score, detectorType, navigationProps, ebt }: AnomaliesBadgeProps) {
  const isNone = isNoAnomalyScore(score);
  const severity = getSeverity(score);
  const text = isNone
    ? i18n.translate('xpack.apm.anomaliesBadge.label.none', {
        defaultMessage: 'None',
      })
    : formatLabelWithScore(getI18nLabel(severity), score);

  const href =
    navigationProps && score !== undefined && !isNone
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
            comparisonEnabled: navigationProps.comparisonEnabled ?? COMPARISON_ENABLED_DEFAULT,
            offset: 'expected_bounds',
          },
        })
      : undefined;

  const tooltipContent = getTooltipContent({
    isNone,
    score,
    detectorType,
    href,
    comparisonEnabled: navigationProps?.comparisonEnabled,
    isInServiceOverview: navigationProps?.isInServiceOverview,
  });

  const roleProps = href ? { href } : { role: 'img' as const, 'aria-label': text };
  const ebtProps =
    ebt && href
      ? getEbtProps({
          ...ebt,
          detail: severity,
        })
      : {};

  return (
    <EuiToolTip position="bottom" content={tooltipContent}>
      <EuiBadge
        tabIndex={0}
        color="hollow"
        css={anomaliesBadgeCss}
        data-test-subj="apmAnomaliesBadge"
        {...roleProps}
        {...ebtProps}
      >
        <EuiHealth
          textSize="inherit"
          color={score === undefined || isNone ? 'subdued' : getSeverityColor(score)}
          css={anomaliesBadgeHealthCss}
        >
          {text}
        </EuiHealth>
      </EuiBadge>
    </EuiToolTip>
  );
}
