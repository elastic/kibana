/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import moment from 'moment';

import {
  EuiFlexGroup,
  EuiFieldNumber,
  EuiFlexItem,
  EuiIconTip,
  EuiSpacer,
  EuiSuperSelect,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import {
  MINUTES_UNIT_LABEL,
  HOURS_UNIT_LABEL,
  DAYS_UNIT_LABEL,
} from '../../../../../shared/constants';
import { SyncEstimate } from '../../../../types';

import { NEXT_SYNC_RUNNING_MESSAGE } from '../../constants';

interface Props {
  label: string;
  description: string;
  duration: string;
  estimate: SyncEstimate;
}

const unitOptions = [
  {
    value: 'minutes',
    inputDisplay: MINUTES_UNIT_LABEL,
  },
  {
    value: 'hours',
    inputDisplay: HOURS_UNIT_LABEL,
  },
  {
    value: 'days',
    inputDisplay: DAYS_UNIT_LABEL,
  },
];

export const FrequencyItem: React.FC<Props> = ({ label, description, duration, estimate }) => {
  const [interval, unit] = formatDuration(duration);
  const { lastRun, nextStart, duration: durationEstimate } = estimate;
  const estimateDisplay = durationEstimate && moment.duration(durationEstimate).humanize();
  const nextStartIsPast = moment().isAfter(nextStart);
  const nextStartTime = nextStartIsPast ? NEXT_SYNC_RUNNING_MESSAGE : moment(nextStart).fromNow();

  const onChange = () => '#TODO';

  const frequencyItemLabel = (
    <FormattedMessage
      id="xpack.enterpriseSearch.workplaceSearch.contentSources.synchronization.frequencyItemLabel"
      defaultMessage="Perform a {label} every"
      values={{
        label: <strong>{label}</strong>,
      }}
    />
  );

  const lastRunSummary = (
    <FormattedMessage
      id="xpack.enterpriseSearch.workplaceSearch.contentSources.synchronization.lastRunSummary"
      defaultMessage="This sync {lastRunStrong} {lastRunTime}."
      values={{
        lastRunStrong: (
          <strong>
            <FormattedMessage
              id="xpack.enterpriseSearch.workplaceSearch.contentSources.synchronization.lastRunLabel"
              defaultMessage="last run"
            />
          </strong>
        ),
        lastRunTime: moment(lastRun).fromNow(),
      }}
    />
  );

  const nextStartSummary = (
    <FormattedMessage
      data-test-subj="nextStartSummary"
      id="xpack.enterpriseSearch.workplaceSearch.contentSources.synchronization.nextStartSummary"
      defaultMessage="{nextStartStrong} will begin {nextStartTime}."
      values={{
        nextStartStrong: (
          <strong>
            <FormattedMessage
              id="xpack.enterpriseSearch.workplaceSearch.contentSources.synchronization.nextStartLabel"
              defaultMessage="Next run"
            />
          </strong>
        ),
        nextStartTime,
      }}
    />
  );

  const estimateSummary = (
    <FormattedMessage
      id="xpack.enterpriseSearch.workplaceSearch.contentSources.synchronization.estimateSummaryLabel"
      defaultMessage="Estimated to take {estimateDisplay} to complete."
      values={{ estimateDisplay }}
    />
  );

  return (
    <>
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiText>{frequencyItemLabel}</EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false} style={{ width: 90 }}>
          <EuiFieldNumber value={interval} />
        </EuiFlexItem>
        <EuiFlexItem grow={false} style={{ width: 128 }}>
          <EuiSuperSelect valueOfSelected={unit} options={unitOptions} onChange={onChange} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiIconTip title={label} type="iInCircle" content={description} />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />
      <EuiText>
        {lastRun && lastRunSummary} {nextStartSummary} {estimateDisplay && estimateSummary}
      </EuiText>
      <EuiSpacer size="s" />
    </>
  );
};

// In most cases, the user will use the form to set the sync frequency, in which case the duration
// will be in the format of "PT3D" (ISO 8601). However, if an operator has set the sync frequency via
// the API, the duration could be a complex format, such as "P1DT2H3M4S". It was decided that in this
// case, we should omit seconds and go with the least common denominator from minutes.
//
// Example: "P1DT2H3M4S" -> "1563 Minutes"
const formatDuration = (duration: string): [interval: number, unit: string] => {
  const momentDuration = moment.duration(duration);
  if (duration.includes('M')) {
    return [Math.round(momentDuration.asMinutes()), unitOptions[0].value];
  }
  if (duration.includes('H')) {
    return [Math.round(momentDuration.asHours()), unitOptions[1].value];
  }
  if (duration.includes('D')) {
    return [Math.round(momentDuration.asDays()), unitOptions[2].value];
  }

  return [1, unitOptions[0].value];
};
