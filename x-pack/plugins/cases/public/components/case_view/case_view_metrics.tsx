/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import prettyMilliseconds from 'pretty-ms';
import styled from 'styled-components';
import {
  EuiDescriptionList,
  EuiDescriptionListDescription,
  EuiDescriptionListTitle,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPanel,
} from '@elastic/eui';
import { CaseMetrics, CaseMetricsFeature } from '../../../common/ui';
import {
  ASSOCIATED_HOSTS_METRIC,
  ASSOCIATED_USERS_METRIC,
  ISOLATED_HOSTS_METRIC,
  TOTAL_ALERTS_METRIC,
  TOTAL_CONNECTORS_METRIC,
} from './translations';
import { getMaybeDate } from '../formatted_date/maybe_date';

const MetricValue = styled(EuiFlexItem)`
  font-size: ${({ theme }) => theme.eui.euiSizeL};
  font-weight: bold;
`;

const CaseStatusMetrics: React.FC<{ statusMetrics?: CaseMetrics['lifespan'] }> = React.memo(
  ({ statusMetrics }) => {
    if (!statusMetrics) {
      return null;
    }

    // TODO: translate
    const items = [
      { title: 'Case created', value: statusMetrics.creationDate },
      {
        title: 'Case in progress duration',
        value: getInProgressDuration(statusMetrics.statusInfo.inProgressDuration),
      },
      {
        title: 'Case open duration',
        value: formatDuration(statusMetrics.statusInfo.openDuration),
      },
      {
        title: 'Duration from case creation to close',
        value: getOpenCloseDuration(statusMetrics.creationDate, statusMetrics.closeDate),
      },
    ];

    return (
      <EuiFlexItem grow={4}>
        <EuiFlexGrid columns={2} gutterSize="s" responsive={false}>
          {items.map(({ title, value }) => (
            <EuiFlexItem>
              <EuiDescriptionList>
                <EuiDescriptionListTitle>{title}</EuiDescriptionListTitle>
                <EuiDescriptionListDescription>{value}</EuiDescriptionListDescription>
              </EuiDescriptionList>
            </EuiFlexItem>
          ))}
        </EuiFlexGrid>
      </EuiFlexItem>
    );
  }
);
CaseStatusMetrics.displayName = 'CaseStatusMetrics';

const formatDuration = (milliseconds: number) => {
  return prettyMilliseconds(milliseconds, { compact: true, verbose: true });
};

// TODO: determine the error values
const getInProgressDuration = (duration: number) => {
  if (duration <= 0) {
    return 'None';
  }

  return formatDuration(duration);
};

const getOpenCloseDuration = (openDate: string, closeDate: string | null) => {
  if (closeDate == null) {
    return 'N/A';
  }

  const openDateObject = getMaybeDate(openDate);
  const closeDateObject = getMaybeDate(closeDate);

  if (!openDateObject.isValid() || !closeDateObject.isValid()) {
    return 'Unknown';
  }

  return formatDuration(closeDateObject.diff(openDateObject));
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

export interface CaseViewMetricsProps {
  metrics: CaseMetrics | null;
  features: CaseMetricsFeature[];
  isLoading: boolean;
}

export const CaseViewMetrics: React.FC<CaseViewMetricsProps> = React.memo(
  ({ metrics, features, isLoading }) => {
    const metricItems = useGetTitleValueMetricItems(metrics, features);
    const statusMetrics = useGetLifespanMetrics(metrics, features);

    return (
      <EuiPanel data-test-subj="case-view-metrics-panel" hasShadow={false} hasBorder={true}>
        <EuiFlexGroup gutterSize="xl" wrap={true} responsive={false}>
          {isLoading ? (
            <EuiFlexItem>
              <EuiLoadingSpinner data-test-subj="case-view-metrics-spinner" size="l" />
            </EuiFlexItem>
          ) : (
            <>
              <CaseViewMetricItems metricItems={metricItems} />
              <CaseStatusMetrics statusMetrics={statusMetrics} />
            </>
          )}
        </EuiFlexGroup>
      </EuiPanel>
    );
  }
);
CaseViewMetrics.displayName = 'CaseViewMetrics';

interface MetricItem {
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

const calculateTotalIsolatedHosts = (actions: CaseMetrics['actions']) => {
  if (!actions?.isolateHost) {
    return 0;
  }

  return Math.max(actions.isolateHost.isolate.total - actions.isolateHost.unisolate.total, 0);
};

const useGetLifespanMetrics = (
  metrics: CaseMetrics | null,
  features: CaseMetricsFeature[]
): CaseMetrics['lifespan'] | undefined => {
  const { lifespan } = metrics ?? {};

  const metricItems = useMemo<CaseMetrics['lifespan']>(() => {
    if (!features.includes('lifespan')) {
      return;
    }

    return lifespan;
  }, [features, lifespan]);

  return metricItems;
};
