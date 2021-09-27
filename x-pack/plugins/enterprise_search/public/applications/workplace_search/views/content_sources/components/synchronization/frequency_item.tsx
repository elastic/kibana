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
  // TODO: This is a temporary solution to display the next sync date. Does not account for API edge cases.
  // Discussion is ongoing on a permanent fix from the API.
  const [numString, unit] = moment.duration(duration).humanize().split(' ');
  const interval = parseInt(numString, 10);
  const { lastRun, nextStart, duration: durationEstimate } = estimate;
  const estimateDisplay = durationEstimate && moment.duration(durationEstimate).humanize();

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
        nextStartTime: moment(nextStart).fromNow(),
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
