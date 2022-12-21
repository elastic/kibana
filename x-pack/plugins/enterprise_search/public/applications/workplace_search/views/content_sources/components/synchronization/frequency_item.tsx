/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';
import moment from 'moment';

import {
  EuiFlexGroup,
  EuiFieldNumber,
  EuiFlexItem,
  EuiIconTip,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  MINUTES_UNIT_LABEL,
  HOURS_UNIT_LABEL,
  DAYS_UNIT_LABEL,
} from '../../../../../shared/constants';
import { SyncEstimate, SyncJobType } from '../../../../types';

import { NEXT_SYNC_RUNNING_MESSAGE } from '../../constants';
import { SourceLogic } from '../../source_logic';

import { SynchronizationLogic } from './synchronization_logic';

interface Props {
  type: SyncJobType;
  label: string;
  description: string;
  duration: string;
  estimate: SyncEstimate;
}

export const FrequencyItem: React.FC<Props> = ({
  type,
  label,
  description,
  duration,
  estimate,
}) => {
  const { contentSource } = useValues(SourceLogic);
  const { setSyncFrequency } = useActions(SynchronizationLogic({ contentSource }));
  const { lastRun, nextStart, duration: durationEstimate } = estimate;
  const estimateDisplay = durationEstimate && moment.duration(durationEstimate).humanize();
  const nextStartIsPast = moment().isAfter(nextStart);
  const nextStartTime = nextStartIsPast ? NEXT_SYNC_RUNNING_MESSAGE : moment(nextStart).fromNow();
  const showEstimates = lastRun || nextStart || durationEstimate;

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
        <EuiFlexItem grow={false} style={{ width: 120 }}>
          <EuiFieldNumber
            data-test-subj="durationDays"
            value={moment.duration(duration).days()}
            append={DAYS_UNIT_LABEL}
            onChange={(e) => setSyncFrequency(type, e.target.value, 'days')}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false} style={{ width: 120 }}>
          <EuiFieldNumber
            data-test-subj="durationHours"
            value={moment.duration(duration).hours()}
            append={HOURS_UNIT_LABEL}
            onChange={(e) => setSyncFrequency(type, e.target.value, 'hours')}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false} style={{ width: 150 }}>
          <EuiFieldNumber
            data-test-subj="durationMinutes"
            value={moment.duration(duration).minutes()}
            append={MINUTES_UNIT_LABEL}
            onChange={(e) => setSyncFrequency(type, e.target.value, 'minutes')}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiIconTip title={label} type="iInCircle" content={description} />
        </EuiFlexItem>
      </EuiFlexGroup>
      {showEstimates && (
        <>
          <EuiSpacer />
          <EuiText data-test-subj="SyncEstimates">
            {lastRun && lastRunSummary} {nextStart && nextStartSummary}{' '}
            {estimateDisplay && estimateSummary}
          </EuiText>
        </>
      )}
      <EuiSpacer size="s" />
    </>
  );
};
