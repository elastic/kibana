/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiDatePicker,
  EuiDescribedFormGroup,
  EuiFlexGroup,
  EuiFormControlLayout,
  EuiFormRow,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import moment, { Moment } from 'moment';
import React, { useMemo, useState } from 'react';
import * as rt from 'io-ts';
import { TimeRange } from './job_config';
import { useUiSetting } from '../../../../../../../../src/plugins/kibana_react/public';

export const timeRangeValidationErrorRT = rt.strict({
  error: rt.literal('INVALID_TIME_RANGE'),
});

export type TimeRangeValidationError = rt.TypeOf<typeof timeRangeValidationErrorRT>;
const startTimeLabel = i18n.translate('xpack.uptime.ml.jobConfig.startTimeLabel', {
  defaultMessage: 'Start time',
});
const endTimeLabel = i18n.translate('xpack.uptime.ml.jobConfig.endTimeLabel', {
  defaultMessage: 'End time',
});
const startTimeDefaultDescription = i18n.translate(
  'xpack.uptime.ml.jobConfig.startTimeDefaultDescription',
  {
    defaultMessage: 'Start of heartbeat data',
  }
);
const endTimeDefaultDescription = i18n.translate(
  'xpack.uptime.ml.jobConfig.endTimeDefaultDescription',
  {
    defaultMessage: 'Indefinitely',
  }
);

function selectedDateToParam(selectedDate: Moment | null) {
  if (selectedDate) {
    return selectedDate.valueOf(); // To ms unix timestamp
  }
  return undefined;
}

export const TimerangePicker: React.FunctionComponent<{
  disabled?: boolean;
  setTimeRange: (tr: TimeRange) => void;
  timeRange: { start: number | undefined; end: number | undefined };
  validationErrors?: TimeRangeValidationError[];
}> = ({
  disabled = false,
  setTimeRange,
  timeRange: { start: startTime, end: endTime },
  validationErrors = [],
}) => {
  const dateFormat = useUiSetting<string>('dateFormat');

  const [now] = useState(() => moment());
  const selectedEndTimeIsToday = !endTime || moment(endTime).isSame(now, 'day');

  const startTimeValue = useMemo(() => {
    return startTime ? moment(startTime) : undefined;
  }, [startTime]);
  const endTimeValue = useMemo(() => {
    return endTime ? moment(endTime) : undefined;
  }, [endTime]);

  const startTimeValidationErrorMessages = useMemo(
    () => getStartTimeValidationErrorMessages(validationErrors),
    [validationErrors]
  );

  const endTimeValidationErrorMessages = useMemo(
    () => getEndTimeValidationErrorMessages(validationErrors),
    [validationErrors]
  );

  return (
    <EuiDescribedFormGroup
      title={
        <h3>
          <FormattedMessage
            id="xpack.uptime.ml.jobConfig.timeRangeTitle"
            defaultMessage="Choose a time range"
          />
        </h3>
      }
      description={
        <FormattedMessage
          id="xpack.uptime.ml.jobConfig.timeRangeDescription"
          defaultMessage="By default, Machine Learning analyzes data in your heartbeat indices no older than two weeks, and continues indefinitely. You can specify a different date to begin, to end, or both."
        />
      }
    >
      <EuiFormRow
        error={startTimeValidationErrorMessages}
        fullWidth
        isInvalid={startTimeValidationErrorMessages.length > 0}
        label={startTimeLabel}
      >
        <EuiFlexGroup gutterSize="s">
          <EuiFormControlLayout
            clear={startTime && !disabled ? { onClick: () => setTimeRange({}) } : undefined}
            isDisabled={disabled}
            compressed={true}
          >
            <EuiDatePicker
              disabled={disabled}
              showTimeSelect
              selected={startTimeValue}
              onChange={(date) => setTimeRange({ start: selectedDateToParam(date), end: endTime })}
              placeholder={startTimeDefaultDescription}
              maxDate={now}
              aria-label={i18n.translate(
                'xpack.uptime.ml.jobConfig.timeRangeStep.timeRangePicker.startDateLabel',
                {
                  defaultMessage: 'Start date',
                }
              )}
              data-test-subj={'uptimeAnomalyJobStartTime'}
              dateFormat={dateFormat}
            />
          </EuiFormControlLayout>
        </EuiFlexGroup>
      </EuiFormRow>
      <EuiFormRow
        error={endTimeValidationErrorMessages}
        fullWidth
        isInvalid={endTimeValidationErrorMessages.length > 0}
        label={endTimeLabel}
      >
        <EuiFlexGroup gutterSize="s">
          <EuiFormControlLayout
            clear={endTime && !disabled ? { onClick: () => setTimeRange({}) } : undefined}
            isDisabled={disabled}
          >
            <EuiDatePicker
              disabled={disabled}
              showTimeSelect
              selected={endTimeValue}
              onChange={(date) =>
                setTimeRange({ end: selectedDateToParam(date), start: startTime })
              }
              placeholder={endTimeDefaultDescription}
              openToDate={now}
              minDate={startTimeValue}
              minTime={selectedEndTimeIsToday ? now : moment().hour(0).minutes(0)}
              maxTime={moment().hour(23).minutes(59)}
              data-test-subj={'uptimeAnomalyJobEndTime'}
              dateFormat={dateFormat}
            />
          </EuiFormControlLayout>
        </EuiFlexGroup>
      </EuiFormRow>
    </EuiDescribedFormGroup>
  );
};

const getStartTimeValidationErrorMessages = (validationErrors: TimeRangeValidationError[]) =>
  validationErrors.flatMap((validationError) => {
    switch (validationError.error) {
      case 'INVALID_TIME_RANGE':
        return [
          i18n.translate('xpack.uptime.ml.jobConfig.startTimeBeforeEndTimeErrorMessage', {
            defaultMessage: 'The start time must be before the end time.',
          }),
        ];
      default:
        return [];
    }
  });

const getEndTimeValidationErrorMessages = (validationErrors: TimeRangeValidationError[]) =>
  validationErrors.flatMap((validationError) => {
    switch (validationError.error) {
      case 'INVALID_TIME_RANGE':
        return [
          i18n.translate('xpack.uptime.ml.jobConfig.endTimeAfterStartTimeErrorMessage', {
            defaultMessage: 'The end time must be after the start time.',
          }),
        ];
      default:
        return [];
    }
  });
