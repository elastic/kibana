/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import type { EuiThemeComputed } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText, EuiTitle, useEuiTheme } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { DistributionBar } from '@kbn/security-solution-distribution-bar';
import { getAbbreviatedNumber } from '@kbn/cloud-security-posture-common';
import { ExpandablePanel } from '../../../flyout/shared/components/expandable_panel';
import { getSeverityColor } from '../../../detections/components/alerts_kpis/severity_level_panel/helpers';
import type {
  AlertsByStatus,
  ParsedAlertsData,
} from '../../../overview/components/detection_response/alerts_by_status/types';

const AlertsCount = ({
  alertsTotal,
  euiTheme,
}: {
  alertsTotal: string | number;
  euiTheme: EuiThemeComputed<{}>;
}) => {
  return (
    <EuiFlexItem>
      <EuiFlexGroup direction="column" gutterSize="none">
        <EuiFlexItem>
          <EuiTitle size="s">
            <h1 data-test-subj={'securitySolutionFlyoutInsightsAlertsCount'}>{alertsTotal}</h1>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText
            size="m"
            css={css`
              font-weight: ${euiTheme.font.weight.semiBold};
            `}
          >
            <FormattedMessage
              id="xpack.securitySolution.flyout.right.insights.alerts.alertsCountDescription"
              defaultMessage="Alerts"
            />
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};

export const AlertsPreview = ({
  alertsData,
  alertsCount,
  isPreviewMode,
}: {
  alertsData: ParsedAlertsData;
  alertsCount: number;
  isPreviewMode?: boolean;
}) => {
  const { euiTheme } = useEuiTheme();

  const severityMap = new Map<string, number>();

  (['open', 'acknowledged'] as AlertsByStatus[]).forEach((status) => {
    alertsData?.[status]?.severities.forEach((severity) => {
      if (severityMap.has(severity.key)) {
        severityMap.set(severity.key, (severityMap?.get(severity.key) || 0) + severity.value);
      } else {
        severityMap.set(severity.key, severity.value);
      }
    });
  });

  const alertStats = Array.from(severityMap, ([key, count]) => ({
    key,
    count,
    color: getSeverityColor(key),
  }));

  return (
    <ExpandablePanel
      header={{
        title: (
          <EuiText
            size="xs"
            css={css`
              font-weight: ${euiTheme.font.weight.semiBold};
            `}
          >
            <FormattedMessage
              id="xpack.securitySolution.flyout.right.insights.alerts.alertsTitle"
              defaultMessage="Alerts"
            />
          </EuiText>
        ),
      }}
      data-test-subj={'securitySolutionFlyoutInsightsAlerts'}
    >
      <EuiFlexGroup gutterSize="none">
        <AlertsCount alertsTotal={getAbbreviatedNumber(alertsCount)} euiTheme={euiTheme} />
        <EuiFlexItem grow={2}>
          <EuiFlexGroup direction="column" gutterSize="none">
            <EuiFlexItem />
            <EuiFlexItem>
              <EuiSpacer />
              <DistributionBar stats={alertStats.reverse()} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </ExpandablePanel>
  );
};
