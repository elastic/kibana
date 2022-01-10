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
  ISOLATED_HOSTS_METRIC,
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

interface MetricItem {
  title: string;
  value: number;
}
type MetricItems = MetricItem[];

const useMetricItems = (
  metrics: CaseMetrics | null,
  features: CaseMetricsFeature[]
): MetricItems => {
  const { alerts, actions, connectors } = metrics ?? {};
  const totalConnectors = connectors?.total ?? 0;
  const alertsCount = alerts?.count ?? 0;
  const totalAlertUsers = alerts?.users?.total ?? 0;
  const totalAlertHosts = alerts?.hosts?.total ?? 0;
  const totalIsolatedHosts =
    actions?.isolateHost && actions.isolateHost.isolate.total >= actions.isolateHost.unisolate.total
      ? actions.isolateHost.isolate.total - actions.isolateHost.unisolate.total
      : 0;

  const metricItems = useMemo<MetricItems>(() => {
    const items: Array<[CaseMetricsFeature, MetricItem]> = [
      ['alerts.count', { title: TOTAL_ALERTS_METRIC, value: alertsCount }],
      ['alerts.users', { title: ASSOCIATED_USERS_METRIC, value: totalAlertUsers }],
      ['alerts.hosts', { title: ASSOCIATED_HOSTS_METRIC, value: totalAlertHosts }],
      ['actions.isolateHost', { title: ISOLATED_HOSTS_METRIC, value: totalIsolatedHosts }],
      ['connectors', { title: TOTAL_CONNECTORS_METRIC, value: totalConnectors }],
    ];

    return items.reduce(
      (result: MetricItems, [feature, item]) => [
        ...result,
        ...(features.includes(feature) ? [item] : []),
      ],
      []
    );
  }, [
    features,
    alertsCount,
    totalAlertUsers,
    totalAlertHosts,
    totalIsolatedHosts,
    totalConnectors,
  ]);

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
