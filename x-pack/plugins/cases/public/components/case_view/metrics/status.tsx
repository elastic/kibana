/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import prettyMilliseconds from 'pretty-ms';
import { EuiFlexGrid, EuiFlexGroup, EuiFlexItem, EuiIconTip, EuiSpacer } from '@elastic/eui';
import { CaseMetrics, CaseMetricsFeature } from '../../../../common/ui';
import {
  CASE_CREATED,
  CASE_IN_PROGRESS_DURATION,
  CASE_OPEN_DURATION,
  CASE_OPEN_TO_CLOSE_DURATION,
  CASE_REOPENED,
  CASE_REOPENED_ON,
} from './translations';
import { getMaybeDate } from '../../formatted_date/maybe_date';
import { FormattedRelativePreferenceDate } from '../../formatted_date';
import { getEmptyTagValue } from '../../empty_value';
import { euiStyled } from '../../../../../../../src/plugins/kibana_react/common';
import { CaseViewMetricsProps } from './types';

export const CaseStatusMetrics: React.FC<Pick<CaseViewMetricsProps, 'metrics' | 'features'>> =
  React.memo(({ metrics, features }) => {
    const lifespanMetrics = useGetLifespanMetrics(metrics, features);

    if (!lifespanMetrics) {
      return null;
    }

    const items = [
      {
        key: 'case-created',
        component: (
          <CaseStatusMetricsItem
            title={CASE_CREATED}
            value={<CreationDate date={lifespanMetrics.creationDate} />}
          />
        ),
        dataTestSubject: 'case-metrics-lifespan-item-creation-date',
      },
      {
        key: 'in-progress-duration',
        component: (
          <CaseStatusMetricsItem
            title={CASE_IN_PROGRESS_DURATION}
            value={getInProgressDuration(lifespanMetrics.statusInfo.inProgressDuration)}
          />
        ),
        dataTestSubject: 'case-metrics-lifespan-item-inProgress-duration',
      },
      {
        key: 'open-duration',
        component: (
          <CaseStatusMetricsItem
            title={CASE_OPEN_DURATION}
            value={formatDuration(lifespanMetrics.statusInfo.openDuration)}
          />
        ),
        dataTestSubject: 'case-metrics-lifespan-item-open-duration',
      },
      {
        key: 'duration-from-creation-to-close',
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
  });
CaseStatusMetrics.displayName = 'CaseStatusMetrics';

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

const CreationDate: React.FC<{ date: string }> = React.memo(({ date }) => {
  const creationDate = getMaybeDate(date);
  if (!creationDate.isValid()) {
    return getEmptyTagValue();
  }

  return (
    <FormattedRelativePreferenceDate
      data-test-subj={'case-metrics-lifespan-creation-date'}
      value={date}
      stripMs={true}
    />
  );
});
CreationDate.displayName = 'CreationDate';

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
      {explanationValues.map((explanationValue, index) => {
        return (
          <React.Fragment key={`explanation-value-${index}`}>
            <FormattedRelativePreferenceDate
              data-test-subj={`case-metrics-lifespan-reopen-${index}`}
              value={explanationValue}
              stripMs={true}
            />
            {isNotLastItem(index, explanationValues.length) ? <EuiSpacer size="xs" /> : null}
          </React.Fragment>
        );
      })}
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

const isNotLastItem = (index: number, arrayLength: number): boolean => index + 1 < arrayLength;
