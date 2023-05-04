/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiSelect, EuiSelectOption } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

interface Props {
  disabled?: boolean;
  minute?: string;
  minuteOptions: EuiSelectOption[];
  hour?: string;
  hourOptions: EuiSelectOption[];
  day?: string;
  dayOptions: EuiSelectOption[];
  onChange: ({ minute, hour, day }: { minute?: string; hour?: string; day?: string }) => void;
}

export const CronWeekly: React.FunctionComponent<Props> = ({
  disabled,
  minute,
  minuteOptions,
  hour,
  hourOptions,
  day,
  dayOptions,
  onChange,
}) => (
  <Fragment>
    <EuiFormRow
      label={
        <FormattedMessage
          id="xpack.enterpriseSearch.cronEditor.cronWeekly.fieldDateLabel"
          defaultMessage="Day"
        />
      }
      fullWidth
      data-test-subj="cronFrequencyConfiguration"
    >
      <EuiSelect
        disabled={disabled}
        options={dayOptions}
        value={day}
        onChange={(e) => onChange({ day: e.target.value })}
        fullWidth
        prepend={i18n.translate('xpack.enterpriseSearch.cronEditor.cronWeekly.textOnLabel', {
          defaultMessage: 'On',
        })}
        data-test-subj="cronFrequencyWeeklyDaySelect"
      />
    </EuiFormRow>

    <EuiFormRow
      label={
        <FormattedMessage
          id="xpack.enterpriseSearch.cronEditor.cronWeekly.fieldTimeLabel"
          defaultMessage="Time"
        />
      }
      fullWidth
      data-test-subj="cronFrequencyConfiguration"
    >
      <EuiFlexGroup gutterSize="xs">
        <EuiFlexItem grow={false}>
          <EuiSelect
            disabled={disabled}
            options={hourOptions}
            value={hour}
            aria-label={i18n.translate(
              'xpack.enterpriseSearch.cronEditor.cronWeekly.hourSelectLabel',
              {
                defaultMessage: 'Hour',
              }
            )}
            onChange={(e) => onChange({ hour: e.target.value })}
            fullWidth
            prepend={i18n.translate(
              'xpack.enterpriseSearch.cronEditor.cronWeekly.fieldHour.textAtLabel',
              {
                defaultMessage: 'At',
              }
            )}
            data-test-subj="cronFrequencyWeeklyHourSelect"
          />
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiSelect
            disabled={disabled}
            options={minuteOptions}
            value={minute}
            onChange={(e) => onChange({ minute: e.target.value })}
            aria-label={i18n.translate(
              'xpack.enterpriseSearch.cronEditor.cronWeekly.minuteSelectLabel',
              {
                defaultMessage: 'Minute',
              }
            )}
            fullWidth
            prepend=":"
            data-test-subj="cronFrequencyWeeklyMinuteSelect"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFormRow>
  </Fragment>
);
