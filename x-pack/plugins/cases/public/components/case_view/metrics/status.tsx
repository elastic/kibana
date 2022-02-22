/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import prettyMilliseconds from 'pretty-ms';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiSpacer,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
} from '@elastic/eui';
import { CaseMetrics, CaseMetricsFeature } from '../../../../common/ui';
import {
  CASE_IN_PROGRESS_DURATION,
  CASE_OPEN_DURATION,
  CASE_OPEN_TO_CLOSE_DURATION,
  CASE_REOPENED,
  CASE_REOPENED_ON,
} from './translations';
import { getMaybeDate } from '../../formatted_date/maybe_date';
import { FormattedRelativePreferenceDate } from '../../formatted_date';
import { CaseViewMetricsProps } from './types';

export const CaseStatusMetrics: React.FC<Pick<CaseViewMetricsProps, 'metrics' | 'features'>> =
  React.memo(({ metrics, features }) => {
    const lifespanMetrics = useGetLifespanMetrics(metrics, features);

    if (!lifespanMetrics) {
      return null;
    }

    const items = [];

    const caseInProgressItem = {
      key: 'in-progress-duration',
      component: (
        <CaseStatusMetricsItem
          title={CASE_IN_PROGRESS_DURATION}
          value={getInProgressDuration(lifespanMetrics.statusInfo.inProgressDuration) || ''}
        />
      ),
      dataTestSubject: 'case-metrics-lifespan-item-inProgress-duration',
    };

    const caseOpenDurationItem = {
      key: 'open-duration',
      component: (
        <CaseStatusMetricsItem
          title={CASE_OPEN_DURATION}
          value={formatDuration(lifespanMetrics.statusInfo.openDuration)}
        />
      ),
      dataTestSubject: 'case-metrics-lifespan-item-open-duration',
    };

    const caseDurationTillCloseItem = {
      key: 'duration-from-creation-to-close',
      component: (
        <CaseStatusMetricsOpenCloseDuration
          title={CASE_OPEN_TO_CLOSE_DURATION}
          value={getOpenCloseDuration(lifespanMetrics.creationDate, lifespanMetrics.closeDate)}
          reopens={lifespanMetrics.statusInfo.reopenDates}
        />
      ),
      dataTestSubject: 'case-metrics-lifespan-item-open-to-close-duration',
    };

    if (getInProgressDuration(lifespanMetrics.statusInfo.inProgressDuration)) {
      items.push(caseInProgressItem);
    }

    items.push(caseOpenDurationItem);

    if (getOpenCloseDuration(lifespanMetrics.creationDate, lifespanMetrics.closeDate)) {
      items.push(caseDurationTillCloseItem);
    }

    return (
      <>
        {items.map(({ component }) => (
          <>{component}</>
        ))}
      </>
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
    return null;
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
    return;
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

const CaseStatusMetricsItem: React.FC<{
  title: string;
  value: JSX.Element | string;
}> = React.memo(({ title, value }) => (
  <>
    <EuiDescriptionListTitle>{title}</EuiDescriptionListTitle>
    <EuiDescriptionListDescription>{value}</EuiDescriptionListDescription>
  </>
));
CaseStatusMetricsItem.displayName = 'CaseStatusMetricsItem';

const CaseStatusMetricsOpenCloseDuration: React.FC<{
  title: string;
  value?: string;
  reopens: string[];
}> = React.memo(({ title, value, reopens }) => {
  const valueText = getOpenCloseDurationText(value, reopens);

  return (
    <>
      <EuiDescriptionListTitle>{title}</EuiDescriptionListTitle>
      <EuiDescriptionListDescription>
        <EuiFlexGroup gutterSize="s">
          {value != null && caseWasReopened(reopens) ? (
            <ValueWithExplanationIcon value={valueText} explanationValues={reopens} />
          ) : (
            <EuiFlexItem>{valueText}</EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiDescriptionListDescription>
    </>
  );
});

CaseStatusMetricsOpenCloseDuration.displayName = 'OpenCloseDuration';

const getOpenCloseDurationText = (value: string | undefined, reopens: string[]) => {
  if (value == null) {
    return null;
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
    <EuiFlexGroup
      responsive={false}
      gutterSize="s"
      alignItems="center"
      data-test-subj="case-metrics-lifespan-reopen-icon"
    >
      <EuiFlexItem grow={false}>{value}</EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiIconTip content={content} position="right" />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});
ValueWithExplanationIcon.displayName = 'ValueWithExplanationIcon';

const isNotLastItem = (index: number, arrayLength: number): boolean => index + 1 < arrayLength;
