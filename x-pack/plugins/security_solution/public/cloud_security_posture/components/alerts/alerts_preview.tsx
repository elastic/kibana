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
import type { AlertSearchResponse } from '../../../detections/containers/detection_engine/alerts/types';
import { ExpandablePanel } from '../../../flyout/shared/components/expandable_panel';
import { getSeverityColor } from '../../../detections/components/alerts_kpis/severity_level_panel/helpers';

interface CspAlertsField {
  'kibana.alert.rule.uuid': string[];
  'kibana.alert.reason': string[];
  'signal.rule.name': string[];
  'signal.rule.severity': string[];
}

interface AlertsDetailsFields {
  fields: CspAlertsField;
}

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
            <h1>{alertsTotal}</h1>
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
  alertsData: AlertSearchResponse<unknown, unknown> | null;
  alertsCount: number;
  isPreviewMode?: boolean;
}) => {
  const { euiTheme } = useEuiTheme();

  const resultX = (alertsData?.hits?.hits as AlertsDetailsFields[])?.map(
    (item: AlertsDetailsFields) => {
      return { fields: item.fields };
    }
  );

  const severities = resultX?.map((item) => item.fields['signal.rule.severity'][0]) || [];
  const alertStats = Object.entries(
    severities.reduce((acc: Record<string, number>, item) => {
      acc[item] = (acc[item] || 0) + 1;
      return acc;
    }, {})
  ).map(([key, count]) => ({
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
