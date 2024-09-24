/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo, useState } from 'react';
import moment, { Moment } from 'moment';
import {
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormLabel,
  EuiHorizontalRule,
  EuiSpacer,
  EuiSplitPanel,
} from '@elastic/eui';
import {
  FIELD_TYPES,
  getUseField,
  useFormData,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { Field } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { Frequency } from '@kbn/rrule';
import { getWeekdayInfo } from '../../helpers/get_weekday_info';
import {
  DEFAULT_FREQUENCY_OPTIONS,
  DEFAULT_PRESETS,
  EndsOptions,
  RECURRENCE_END_OPTIONS,
} from '../../constants';
import * as i18n from '../../translations';
import { CustomRecurringSchedule } from './custom_recurring_schedule';
import { recurringSummary } from '../../helpers/recurring_summary';
import { getPresets } from '../../helpers/get_presets';
import { FormProps } from '../schema';
import { parseSchedule } from '../../helpers/parse_schedule';

const UseField = getUseField({ component: Field });

export const toMoment = (value: string): Moment => moment(value);
export const toString = (value: Moment): string => value.toISOString();

export const RecurringSchedule: React.FC = React.memo(() => {
  const [today] = useState<Moment>(moment());

  const [{ startDate, endDate, timezone, recurringSchedule }] = useFormData<FormProps>({
    watch: [
      'startDate',
      'endDate',
      'timezone',
      'recurringSchedule.frequency',
      'recurringSchedule.interval',
      'recurringSchedule.ends',
      'recurringSchedule.until',
      'recurringSchedule.count',
      'recurringSchedule.customFrequency',
      'recurringSchedule.byweekday',
      'recurringSchedule.bymonth',
    ],
  });

  const { options, presets } = useMemo(() => {
    if (!startDate) {
      return { options: DEFAULT_FREQUENCY_OPTIONS, presets: DEFAULT_PRESETS };
    }
    const date = moment(startDate);
    const { dayOfWeek, nthWeekdayOfMonth, isLastOfMonth } = getWeekdayInfo(date);
    return {
      options: [
        {
          text: i18n.CREATE_FORM_FREQUENCY_DAILY,
          value: Frequency.DAILY,
          'data-test-subj': 'recurringScheduleOptionDaily',
        },
        {
          text: i18n.CREATE_FORM_FREQUENCY_WEEKLY_ON(dayOfWeek),
          value: Frequency.WEEKLY,
          'data-test-subj': 'recurringScheduleOptionWeekly',
        },
        {
          text: i18n.CREATE_FORM_FREQUENCY_NTH_WEEKDAY(dayOfWeek)[
            isLastOfMonth ? 0 : nthWeekdayOfMonth
          ],
          value: Frequency.MONTHLY,
          'data-test-subj': 'recurringScheduleOptionMonthly',
        },
        {
          text: i18n.CREATE_FORM_FREQUENCY_YEARLY_ON(date),
          value: Frequency.YEARLY,
          'data-test-subj': 'recurringScheduleOptionYearly',
        },
        {
          text: i18n.CREATE_FORM_FREQUENCY_CUSTOM,
          value: 'CUSTOM',
          'data-test-subj': 'recurringScheduleOptionCustom',
        },
      ],
      presets: getPresets(date),
    };
  }, [startDate]);

  const parsedSchedule = useMemo(() => {
    return parseSchedule(recurringSchedule);
  }, [recurringSchedule]);

  return (
    <EuiSplitPanel.Outer hasShadow={false} hasBorder={true}>
      <EuiSplitPanel.Inner color="subdued">
        <UseField
          path="recurringSchedule.frequency"
          componentProps={{
            'data-test-subj': 'frequency-field',
            euiFieldProps: {
              'data-test-subj': 'recurringScheduleRepeatSelect',
              options,
            },
          }}
        />
        {(parsedSchedule?.frequency === Frequency.DAILY ||
          parsedSchedule?.frequency === 'CUSTOM') && (
          <CustomRecurringSchedule data-test-subj="custom-recurring-form" />
        )}
        <UseField
          path="recurringSchedule.ends"
          componentProps={{
            'data-test-subj': 'ends-field',
            euiFieldProps: {
              legend: 'Recurrence ends',
              options: RECURRENCE_END_OPTIONS,
            },
          }}
        />
        {parsedSchedule?.ends === EndsOptions.ON_DATE ? (
          <>
            <EuiSpacer size="m" />
            <EuiFlexGroup alignItems="flexEnd">
              <EuiFlexItem grow={3}>
                <UseField
                  path="recurringSchedule.until"
                  config={{
                    type: FIELD_TYPES.DATE_PICKER,
                    label: '',
                    defaultValue: moment(endDate).endOf('day').toISOString(),
                    validations: [],
                    serializer: toString,
                    deserializer: toMoment,
                  }}
                  componentProps={{
                    'data-test-subj': 'until-field',
                    euiFieldProps: {
                      showTimeSelect: false,
                      minDate: today,
                    },
                  }}
                />
              </EuiFlexItem>
              {timezone ? (
                <EuiFlexItem grow={1}>
                  <EuiComboBox
                    data-test-subj="disabled-timezone-field"
                    id="disabled-timezone"
                    isDisabled
                    singleSelection={{ asPlainText: true }}
                    selectedOptions={[{ label: timezone[0] }]}
                    isClearable={false}
                    prepend={
                      <EuiFormLabel htmlFor={'disabled-timezone'}>
                        {i18n.CREATE_FORM_TIMEZONE}
                      </EuiFormLabel>
                    }
                  />
                </EuiFlexItem>
              ) : null}
            </EuiFlexGroup>
          </>
        ) : null}
        {parsedSchedule?.ends === EndsOptions.AFTER_X ? (
          <UseField
            path="recurringSchedule.count"
            componentProps={{
              'data-test-subj': 'count-field',
              id: 'count',
              euiFieldProps: {
                'data-test-subj': 'recurringScheduleAfterXOccurenceInput',
                type: 'number',
                min: 1,
                prepend: (
                  <EuiFormLabel htmlFor={'count'}>{i18n.CREATE_FORM_COUNT_AFTER}</EuiFormLabel>
                ),
                append: (
                  <EuiFormLabel htmlFor={'count'}>{i18n.CREATE_FORM_COUNT_OCCURRENCE}</EuiFormLabel>
                ),
              },
            }}
          />
        ) : null}
      </EuiSplitPanel.Inner>
      <EuiHorizontalRule margin="none" />
      <EuiSplitPanel.Inner>
        {i18n.CREATE_FORM_RECURRING_SUMMARY_PREFIX(
          recurringSummary(moment(startDate), parsedSchedule, presets)
        )}
      </EuiSplitPanel.Inner>
    </EuiSplitPanel.Outer>
  );
});
RecurringSchedule.displayName = 'RecurringSchedule';
