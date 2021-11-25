/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import styled from 'styled-components';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiPanel } from '@elastic/eui';
import { CaseMetrics } from '../../../common';
import {
  ASSOCIATED_HOSTS_METRIC,
  ASSOCIATED_USERS_METRIC,
  TOTAL_ALERTS_METRIC,
  TOTAL_CONNECTORS_METRIC,
} from './translations';

const MetricValue = styled(EuiFlexItem)`
  font-size: ${({ theme }) => theme.eui.euiSizeL};
  font-weight: bold;
`;

export interface CaseViewMetricsProps {
  metrics: CaseMetrics | null;
  isLoading: boolean;
}

type MetricItems = Array<{ title: string; value: number }>;

const useMetricItems = (metrics: CaseMetrics | null): MetricItems => {
  const { alertsCount, alertUsers, alertHosts, connectors } = metrics ?? {};
  const totalConnectors = connectors?.length;
  const totalAlertUsers = alertUsers?.total;
  const totalAlertHosts = alertHosts?.total;

  const metricItems = useMemo<MetricItems>(() => {
    const items = [];
    if (alertsCount != null) {
      items.push({ title: TOTAL_ALERTS_METRIC, value: alertsCount });
    }
    if (totalAlertUsers != null) {
      items.push({ title: ASSOCIATED_USERS_METRIC, value: totalAlertUsers });
    }
    if (totalAlertHosts != null) {
      items.push({ title: ASSOCIATED_HOSTS_METRIC, value: totalAlertHosts });
    }
    if (totalConnectors != null) {
      items.push({ title: TOTAL_CONNECTORS_METRIC, value: totalConnectors });
    }
    return items;
  }, [alertsCount, totalAlertUsers, totalAlertHosts, totalConnectors]);

  return metricItems;
};

const CaseViewMetricItems: React.FC<{ metricItems: MetricItems }> = React.memo(
  ({ metricItems }) => (
    <>
      {metricItems.map(({ title, value }, index) => (
        <EuiFlexItem key={index}>
          <EuiFlexGroup direction="column" gutterSize="s">
            <EuiFlexItem>{title}</EuiFlexItem>
            <MetricValue>{value}</MetricValue>
          </EuiFlexGroup>
        </EuiFlexItem>
      ))}
    </>
  )
);
CaseViewMetricItems.displayName = 'CaseViewMetricItems';

export const CaseViewMetrics: React.FC<CaseViewMetricsProps> = React.memo(
  ({ metrics, isLoading }) => {
    const metricItems = useMetricItems(metrics);
    return (
      <EuiPanel data-test-subj="case-view-metrics-panel" hasShadow={false} hasBorder={true}>
        <EuiFlexGroup gutterSize="xl">
          {isLoading ? (
            <EuiFlexItem>
              <EuiLoadingSpinner data-test-subj="case-view-metrics-spinner" size="l" />
            </EuiFlexItem>
          ) : (
            <CaseViewMetricItems metricItems={metricItems} />
          )}
        </EuiFlexGroup>
      </EuiPanel>
    );
  }
);
CaseViewMetrics.displayName = 'CaseViewMetrics';
