/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { CaseMetrics, CaseMetricsFeature } from '../../../../common/ui';
import {
  ASSOCIATED_HOSTS_METRIC,
  ASSOCIATED_USERS_METRIC,
  ISOLATED_HOSTS_METRIC,
  TOTAL_ALERTS_METRIC,
  TOTAL_CONNECTORS_METRIC,
} from './translations';
import { euiStyled } from '../../../../../../../src/plugins/kibana_react/common';
import { CaseViewMetricsProps } from './types';

export const CaseViewMetricItems: React.FC<Pick<CaseViewMetricsProps, 'metrics' | 'features'>> =
  React.memo(({ metrics, features }) => {
    const metricItems = useGetTitleValueMetricItems(metrics, features);

    return (
      <>
        {metricItems.map(({ id, title, value }) => (
          <EuiFlexItem key={title} data-test-subj={`case-metrics-totals-${id}`}>
            <EuiFlexGroup direction="column" gutterSize="s" responsive={false}>
              <EuiFlexItem>{title}</EuiFlexItem>
              <MetricValue>{value}</MetricValue>
            </EuiFlexGroup>
          </EuiFlexItem>
        ))}
      </>
    );
  });
CaseViewMetricItems.displayName = 'CaseViewMetricItems';

const MetricValue = euiStyled(EuiFlexItem)`
  font-size: ${({ theme }) => theme.eui.euiSizeL};
  font-weight: bold;
`;

interface MetricItem {
  id: string;
  title: string;
  value: number;
}
type MetricItems = MetricItem[];

const useGetTitleValueMetricItems = (
  metrics: CaseMetrics | null,
  features: CaseMetricsFeature[]
): MetricItems => {
  const { alerts, actions, connectors } = metrics ?? {};
  const totalConnectors = connectors?.total ?? 0;
  const alertsCount = alerts?.count ?? 0;
  const totalAlertUsers = alerts?.users?.total ?? 0;
  const totalAlertHosts = alerts?.hosts?.total ?? 0;
  const totalIsolatedHosts = calculateTotalIsolatedHosts(actions);

  const metricItems = useMemo<MetricItems>(() => {
    const items: Array<[CaseMetricsFeature, Omit<MetricItem, 'id'>]> = [
      ['alerts.count', { title: TOTAL_ALERTS_METRIC, value: alertsCount }],
      ['alerts.users', { title: ASSOCIATED_USERS_METRIC, value: totalAlertUsers }],
      ['alerts.hosts', { title: ASSOCIATED_HOSTS_METRIC, value: totalAlertHosts }],
      ['actions.isolateHost', { title: ISOLATED_HOSTS_METRIC, value: totalIsolatedHosts }],
      ['connectors', { title: TOTAL_CONNECTORS_METRIC, value: totalConnectors }],
    ];

    return items.reduce(
      (result: MetricItems, [feature, item]) => [
        ...result,
        ...(features.includes(feature) ? [{ id: feature, ...item }] : []),
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

const calculateTotalIsolatedHosts = (actions: CaseMetrics['actions']) => {
  if (!actions?.isolateHost) {
    return 0;
  }

  // prevent the metric from being negative
  return Math.max(actions.isolateHost.isolate.total - actions.isolateHost.unisolate.total, 0);
};
