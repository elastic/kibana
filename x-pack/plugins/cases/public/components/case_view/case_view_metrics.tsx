/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import styled from 'styled-components';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiPanel } from '@elastic/eui';
import { CaseMetrics, CaseMetricsFeature } from '../../../common/ui';
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
  features: CaseMetricsFeature[];
  isLoading: boolean;
}

type MetricItems = Array<{ title: string; value: number }>;

const useMetricItems = (
  metrics: CaseMetrics | null,
  features: CaseMetricsFeature[]
): MetricItems => {
  const { alerts, connectors } = metrics ?? {};
  const totalConnectors = connectors?.length ?? 0;
  const alertsCount = alerts?.count ?? 0;
  const totalAlertUsers = alerts?.users?.total ?? 0;
  const totalAlertHosts = alerts?.hosts?.total ?? 0;

  const metricItems = useMemo<MetricItems>(() => {
    const items = [];
    if (features.includes('alerts.count')) {
      items.push({ title: TOTAL_ALERTS_METRIC, value: alertsCount });
    }
    if (features.includes('alerts.users')) {
      items.push({ title: ASSOCIATED_USERS_METRIC, value: totalAlertUsers });
    }
    if (features.includes('alerts.hosts')) {
      items.push({ title: ASSOCIATED_HOSTS_METRIC, value: totalAlertHosts });
    }
    if (features.includes('connectors')) {
      items.push({ title: TOTAL_CONNECTORS_METRIC, value: totalConnectors });
    }
    return items;
  }, [features, alertsCount, totalAlertUsers, totalAlertHosts, totalConnectors]);

  return metricItems;
};

const CaseViewMetricItems: React.FC<{ metricItems: MetricItems }> = React.memo(
  ({ metricItems }) => (
    <>
      {metricItems.map(({ title, value }, index) => (
        <EuiFlexItem key={index}>
          <EuiFlexGroup direction="column" gutterSize="s" responsive={false}>
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
  ({ metrics, features, isLoading }) => {
    const metricItems = useMetricItems(metrics, features);
    return (
      <EuiPanel data-test-subj="case-view-metrics-panel" hasShadow={false} hasBorder={true}>
        <EuiFlexGroup gutterSize="xl" wrap={true} responsive={false}>
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
