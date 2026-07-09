/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiHealth, EuiToolTip } from '@elastic/eui';
import type { AnomalyDetectorType } from '@kbn/apm-types';
import type { AgentName } from '@kbn/elastic-agent-utils';
import { ML_ANOMALY_SEVERITY } from '@kbn/ml-anomaly-utils/anomaly_severity';
import { isMobileAgentName } from '../../../../../common/agent_name';
import { getSeverity, getSeverityColor } from '../../../../../common/anomaly_detection';
import type { Environment } from '../../../../../common/environment_rt';
import {
  anomaliesBadgeCss,
  anomaliesBadgeHealthCss,
  formatLabelWithScore,
  getAnomalyTooltipContent,
  getI18nLabel,
} from '../../../app/service_inventory/service_list/anomalies_badge';
import { useServiceFlyoutContext } from '../service_flyout_context';

export interface FlyoutAnomaliesBadgeNavigationProps {
  serviceName: string;
  agentName: AgentName;
  anomalyEnvironment: Environment;
  rangeFrom: string;
  rangeTo: string;
}

interface FlyoutAnomaliesBadgeProps {
  score: number | undefined;
  detectorType: AnomalyDetectorType | undefined;
  // Separate from AnomaliesBadge to avoid pulling useApmRouter (which requires
  // the APM router context) into the flyout. URL is built via core.http.basePath.
  navigationProps?: FlyoutAnomaliesBadgeNavigationProps;
}

export function FlyoutAnomaliesBadge({
  score,
  detectorType,
  navigationProps,
}: FlyoutAnomaliesBadgeProps) {
  const { core } = useServiceFlyoutContext();
  const severity = getSeverity(score);
  const text = formatLabelWithScore(getI18nLabel(severity), score);

  const href =
    navigationProps && score !== undefined
      ? buildHref(core.http.basePath, severity, navigationProps)
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

function buildHref(
  basePath: ReturnType<typeof useServiceFlyoutContext>['core']['http']['basePath'],
  severity: ML_ANOMALY_SEVERITY,
  {
    serviceName,
    agentName,
    anomalyEnvironment,
    rangeFrom,
    rangeTo,
  }: FlyoutAnomaliesBadgeNavigationProps
): string {
  const path = isMobileAgentName(agentName)
    ? `/mobile-services/${serviceName}/overview`
    : `/services/${serviceName}/overview`;

  const params = new URLSearchParams({
    kuery: '',
    serviceGroup: '',
    comparisonEnabled: 'true',
    rangeFrom,
    rangeTo,
    environment: anomalyEnvironment,
    offset: 'expected_bounds',
  });

  if (severity !== ML_ANOMALY_SEVERITY.UNKNOWN) {
    params.set('anomalyThreshold', severity);
  }

  return basePath.prepend(`/app/apm${path}?${params.toString()}`);
}
