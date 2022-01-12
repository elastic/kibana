/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import prettyMilliseconds from 'pretty-ms';
import {
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPanel,
  EuiIconTip,
} from '@elastic/eui';
import { CaseMetrics, CaseMetricsFeature } from '../../../common/ui';
import {
  ASSOCIATED_HOSTS_METRIC,
  ASSOCIATED_USERS_METRIC,
  CASE_CREATED,
  CASE_IN_PROGRESS_DURATION,
  CASE_OPEN_DURATION,
  CASE_OPEN_TO_CLOSE_DURATION,
  CASE_REOPENED,
  CASE_REOPENED_ON,
  ISOLATED_HOSTS_METRIC,
  TOTAL_ALERTS_METRIC,
  TOTAL_CONNECTORS_METRIC,
} from './translations';
import { getMaybeDate } from '../formatted_date/maybe_date';
import { FormattedDate, FormattedRelativePreferenceDate } from '../formatted_date';
import { getEmptyTagValue } from '../empty_value';
import { euiStyled } from '../../../../../../src/plugins/kibana_react/common';

const CaseStatusMetrics: React.FC<{ lifespanMetrics?: CaseMetrics['lifespan'] }> = React.memo(
  ({ lifespanMetrics }) => {
    if (!lifespanMetrics) {
      return null;
    }

    const items = [
      {
        key: CASE_CREATED,
        component: (
          <CaseStatusMetricsItem
            title={CASE_CREATED}
            value={getCaseCreationDate(lifespanMetrics.creationDate)}
          />
        ),
        dataTestSubject: 'case-metrics-lifespan-item-creation-date',
      },
      {
        key: CASE_IN_PROGRESS_DURATION,
        component: (
          <CaseStatusMetricsItem
            title={CASE_IN_PROGRESS_DURATION}
            value={getInProgressDuration(lifespanMetrics.statusInfo.inProgressDuration)}
          />
        ),
        dataTestSubject: 'case-metrics-lifespan-item-inProgress-duration',
      },
      {
        key: CASE_OPEN_DURATION,
        component: (
          <CaseStatusMetricsItem
            title={CASE_OPEN_DURATION}
            value={formatDuration(lifespanMetrics.statusInfo.openDuration)}
          />
        ),
        dataTestSubject: 'case-metrics-lifespan-item-open-duration',
      },
      {
        key: CASE_OPEN_TO_CLOSE_DURATION,
        component: (
          <CaseStatusMetricsOpenCloseDuration
            title={CASE_OPEN_TO_CLOSE_DURATION}
            value={getOpenCloseDuration(lifespanMetrics.creationDate, lifespanMetrics.closeDate)}
            reopens={lifespanMetrics.statusInfo.reopenDates}
          />
        ),
        dataTestSubject: 'case-metrics-lifespan-item-open-to-close-duration',
      },
    ];

    return (
      <EuiFlexItem grow={3}>
        <EuiFlexGrid columns={2} gutterSize="s" responsive={false}>
          {items.map(({ component, dataTestSubject, key }) => (
            <EuiFlexItem data-test-subj={dataTestSubject} key={key}>
              {component}
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

const getInProgressDuration = (duration: number) => {
  if (duration <= 0) {
    return getEmptyTagValue();
  }

  return formatDuration(duration);
};

const formatDuration = (milliseconds: number) => {
  return prettyMilliseconds(milliseconds, { compact: true, verbose: true });
};

const getOpenCloseDuration = (openDate: string, closeDate: string | null): string | undefined => {
  if (closeDate == null) {
    return;
  }

  const openDateObject = getMaybeDate(openDate);
  const closeDateObject = getMaybeDate(closeDate);

  if (!openDateObject.isValid() || !closeDateObject.isValid()) {
    return;
  }

  return formatDuration(closeDateObject.diff(openDateObject));
};

const Title = euiStyled(EuiFlexItem)`
  font-size: ${({ theme }) => theme.eui.euiSizeM};
  font-weight: bold;
`;

const CaseStatusMetricsItem: React.FC<{
  title: string;
  value: JSX.Element | string;
}> = React.memo(({ title, value }) => (
  <EuiFlexGroup direction="column" gutterSize="s" responsive={false}>
    <Title>{title}</Title>
    <EuiFlexItem>{value}</EuiFlexItem>
  </EuiFlexGroup>
));
CaseStatusMetricsItem.displayName = 'CaseStatusMetricsItem';

const CaseStatusMetricsOpenCloseDuration: React.FC<{
  title: string;
  value?: string;
  reopens: string[];
}> = React.memo(({ title, value, reopens }) => {
  const valueText = getOpenCloseDurationText(value, reopens);

  return (
    <EuiFlexGroup direction="column" gutterSize="s" responsive={false}>
      <Title>{title}</Title>
      {value != null && caseWasReopened(reopens) ? (
        <ValueWithExplanationIcon value={valueText} explanationValues={reopens} />
      ) : (
        <EuiFlexItem>{valueText}</EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
});
CaseStatusMetricsOpenCloseDuration.displayName = 'OpenCloseDuration';

const getOpenCloseDurationText = (value: string | undefined, reopens: string[]) => {
  if (value == null) {
    return getEmptyTagValue();
  } else if (reopens.length > 0) {
    return `${value} ${CASE_REOPENED}`;
  }

  return value;
};

const caseWasReopened = (reopens: string[]) => {
  return reopens.length > 0;
};

const ValueWithExplanationIcon: React.FC<{
  value: string | JSX.Element;
  explanationValues: string[];
}> = React.memo(({ value, explanationValues }) => {
  const content = (
    <>
      {CASE_REOPENED_ON}
      {explanationValues.map((explanationValue, index) => (
        <React.Fragment key={`explanation-value-${index}`}>
          <FormattedDate
            data-test-subj={`case-metrics-lifespan-reopen-${index}`}
            value={explanationValue}
          />{' '}
        </React.Fragment>
      ))}
    </>
  );

  return (
    <EuiFlexItem data-test-subj="case-metrics-lifespan-reopen-icon">
      <EuiFlexGroup responsive={false} gutterSize="s" alignItems="center">
        <EuiFlexItem grow={false}>{value}</EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiIconTip content={content} position="right" />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  );
});
ValueWithExplanationIcon.displayName = 'ValueWithExplanationIcon';

const MetricValue = euiStyled(EuiFlexItem)`
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
      statusInfo: { inProgressDuration: 0, reopenDates: [], openDuration: 0 },
    };

    if (!features.includes('lifespan')) {
      return;
    }

    return lifespan;
  }, [features, metrics]);
};
