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
  CASE_CREATED,
  CASE_IN_PROGRESS_DURATION,
  CASE_OPEN_DURATION,
  CASE_OPEN_TO_CLOSE_DURATION,
  ISOLATED_HOSTS_METRIC,
  TOTAL_ALERTS_METRIC,
  TOTAL_CONNECTORS_METRIC,
} from './translations';
import { getMaybeDate } from '../formatted_date/maybe_date';
import { FormattedRelativePreferenceDate } from '../formatted_date';
import { getEmptyTagValue } from '../empty_value';

const CaseStatusMetrics: React.FC<{ lifespanMetrics?: CaseMetrics['lifespan'] }> = React.memo(
  ({ lifespanMetrics }) => {
    if (!lifespanMetrics) {
      return null;
    }

    const items = [
      {
        title: CASE_CREATED,
        value: getCaseCreationDate(lifespanMetrics.creationDate),
        dataTestSubject: 'case-metrics-lifespan-item-creation-date',
      },
      {
        title: CASE_IN_PROGRESS_DURATION,
        value: getInProgressDuration(lifespanMetrics.statusInfo.inProgressDuration),
        dataTestSubject: 'case-metrics-lifespan-item-inProgress-duration',
      },
      {
        title: CASE_OPEN_DURATION,
        value: formatDuration(lifespanMetrics.statusInfo.openDuration),
        dataTestSubject: 'case-metrics-lifespan-item-open-duration',
      },
      {
        title: CASE_OPEN_TO_CLOSE_DURATION,
        value: getOpenCloseDuration(lifespanMetrics.creationDate, lifespanMetrics.closeDate),
        dataTestSubject: 'case-metrics-lifespan-item-open-to-close-duration',
      },
    ];

    return (
      <EuiFlexItem grow={4}>
        <EuiFlexGrid columns={2} gutterSize="s" responsive={false}>
          {items.map(({ title, value, dataTestSubject }) => (
            <EuiFlexItem data-test-subj={dataTestSubject} key={title}>
              <EuiDescriptionList compressed>
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

const getCaseCreationDate = (date: string) => {
  const creationDate = getMaybeDate(date);
  if (!creationDate.isValid()) {
    return getEmptyTagValue();
  }

  return (
    <FormattedRelativePreferenceDate
      data-test-subj={'case-metrics-lifespan-creation-date'}
      value={date}
    />
  );
};

const formatDuration = (milliseconds: number) => {
  return prettyMilliseconds(milliseconds, { compact: true, verbose: true });
};

const getInProgressDuration = (duration: number) => {
  if (duration <= 0) {
    return getEmptyTagValue();
  }

  return formatDuration(duration);
};

const getOpenCloseDuration = (openDate: string, closeDate: string | null) => {
  if (closeDate == null) {
    return getEmptyTagValue();
  }

  const openDateObject = getMaybeDate(openDate);
  const closeDateObject = getMaybeDate(closeDate);

  if (!openDateObject.isValid() || !closeDateObject.isValid()) {
    return getEmptyTagValue();
  }

  return formatDuration(closeDateObject.diff(openDateObject));
};

const MetricValue = styled(EuiFlexItem)`
  font-size: ${({ theme }) => theme.eui.euiSizeL};
  font-weight: bold;
`;

const CaseViewMetricItems: React.FC<{ metricItems: MetricItems }> = React.memo(
  ({ metricItems }) => (
    <>
      {metricItems.map(({ title, value }) => (
        <EuiFlexItem key={title}>
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
        <EuiFlexGroup gutterSize="xl" wrap={true} responsive={false} alignItems="center">
          {isLoading ? (
            <EuiFlexItem>
              <EuiLoadingSpinner data-test-subj="case-view-metrics-spinner" size="l" />
            </EuiFlexItem>
          ) : (
            <>
              <CaseViewMetricItems metricItems={metricItems} />
              <CaseStatusMetrics lifespanMetrics={statusMetrics} />
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

  // prevent the metric from being negative
  return Math.max(actions.isolateHost.isolate.total - actions.isolateHost.unisolate.total, 0);
};

const useGetLifespanMetrics = (
  metrics: CaseMetrics | null,
  features: CaseMetricsFeature[]
): CaseMetrics['lifespan'] | undefined => {
  return useMemo<CaseMetrics['lifespan']>(() => {
    const lifespan = metrics?.lifespan ?? {
      closeDate: '',
      creationDate: '',
      statusInfo: { inProgressDuration: 0, numberOfReopens: 0, openDuration: 0 },
    };

    if (!features.includes('lifespan')) {
      return;
    }

    return lifespan;
  }, [features, metrics]);
};
