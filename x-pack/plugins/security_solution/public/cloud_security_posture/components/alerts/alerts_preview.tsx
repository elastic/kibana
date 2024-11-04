/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { v4 as uuid } from 'uuid';
import { css } from '@emotion/react';
import type { EuiThemeComputed } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText, EuiTitle, useEuiTheme } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { DistributionBar } from '@kbn/security-solution-distribution-bar';
import { getAbbreviatedNumber } from '@kbn/cloud-security-posture-common';
import { ExpandablePanel } from '../../../flyout/shared/components/expandable_panel';
import { useSummaryChartData } from '../../../detections/components/alerts_kpis/alerts_summary_charts_panel/use_summary_chart_data';
import {
  getIsAlertsBySeverityData,
  getSeverityColor,
} from '../../../detections/components/alerts_kpis/severity_level_panel/helpers';
import { severityAggregations } from '../../../detections/components/alerts_kpis/alerts_summary_charts_panel/aggregations';

const ENTITY_ALERT_PREVIEW_COUNT_ID = 'entity-alert-preview-count';

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
  name,
  fieldName,
  isPreviewMode,
}: {
  name: string;
  fieldName: 'host.name' | 'user.name';
  isPreviewMode?: boolean;
}) => {
  const { euiTheme } = useEuiTheme();
  const uniqueQueryId = useMemo(() => `${ENTITY_ALERT_PREVIEW_COUNT_ID}-${uuid()}`, []);
  const entityFilter = useMemo(() => ({ field: fieldName, value: name }), [fieldName, name]);

  const { items, isLoading } = useSummaryChartData({
    aggregations: severityAggregations,
    entityFilter,
    uniqueQueryId,
    signalIndexName: null,
  });

  const data = useMemo(() => (getIsAlertsBySeverityData(items) ? items : []), [items]);
  const totalAlerts = data.reduce((accumulator, current) => accumulator + current.value, 0);
  const alertStats = useMemo(() => {
    return data.map((item) => ({
      key: item.key,
      count: item.value,
      color: getSeverityColor(item.key),
    }));
  }, [data]);

  if (!isLoading && items.length === 0) return null;
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
        <AlertsCount alertsTotal={getAbbreviatedNumber(totalAlerts)} euiTheme={euiTheme} />
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
