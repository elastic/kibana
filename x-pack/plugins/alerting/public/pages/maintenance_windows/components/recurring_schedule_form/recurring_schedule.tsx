/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import moment from 'moment';
import {
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormLabel,
  EuiHorizontalRule,
  EuiSpacer,
  EuiSplitPanel,
} from '@elastic/eui';
import { getUseField, useFormData } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { Field } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { getWeekdayInfo } from '../../helpers/get_weekday_info';
import {
  DEFAULT_FREQUENCY_OPTIONS,
  DEFAULT_PRESETS,
  EndsOptions,
  Frequency,
  RECURRENCE_END_OPTIONS,
} from '../../constants';
import * as i18n from '../../translations';
import { ButtonGroupField } from '../fields/button_group_field';
import { DatePickerField } from '../fields/date_picker_field';
import { CustomRecurringSchedule } from './custom_recurring_schedule';
import { recurringSummary } from '../../helpers/recurring_summary';
import { getPresets } from '../../helpers/get_presets';
import { FormProps } from '../schema';

const UseField = getUseField({ component: Field });

export const RecurringSchedule: React.FC = React.memo(() => {
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
        },
        {
          text: i18n.CREATE_FORM_FREQUENCY_WEEKLY_ON(dayOfWeek),
          value: Frequency.WEEKLY,
        },
        {
          text: i18n.CREATE_FORM_FREQUENCY_NTH_WEEKDAY(dayOfWeek)[
            isLastOfMonth ? 0 : nthWeekdayOfMonth
          ],
          value: Frequency.MONTHLY,
        },
        {
          text: i18n.CREATE_FORM_FREQUENCY_YEARLY_ON(date),
          value: Frequency.YEARLY,
        },
        {
          text: i18n.CREATE_FORM_FREQUENCY_CUSTOM,
          value: 'CUSTOM',
        },
      ],
      presets: getPresets(date),
    };
  }, [startDate]);

  return (
    <EuiSplitPanel.Outer hasShadow={false} hasBorder={true}>
      <EuiSplitPanel.Inner color="subdued">
        <UseField
          path="recurringSchedule.frequency"
          componentProps={{
            'data-test-subj': 'frequency-field',
            euiFieldProps: {
              options,
            },
          }}
        />
        {recurringSchedule?.frequency === Frequency.DAILY ||
        recurringSchedule?.frequency === 'CUSTOM' ? (
          <CustomRecurringSchedule data-test-subj="custom-recurring-form" />
        ) : null}
        <UseField
          path="recurringSchedule.ends"
          component={ButtonGroupField}
          componentProps={{
            'data-test-subj': 'ends-field',
            legend: 'Recurrence ends',
            options: RECURRENCE_END_OPTIONS,
          }}
        />
        {recurringSchedule?.ends === EndsOptions.ON_DATE ? (
          <>
            <EuiSpacer size="m" />
            <EuiFlexGroup alignItems="flexEnd">
              <EuiFlexItem grow={3}>
                <UseField
                  path="recurringSchedule.until"
                  config={{
                    label: '',
                    defaultValue: moment(endDate).endOf('day').toISOString(),
                    validations: [],
                  }}
                  component={DatePickerField}
                  componentProps={{
                    'data-test-subj': 'until-field',
                    showTimeSelect: false,
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
        {recurringSchedule?.ends === EndsOptions.AFTER_X ? (
          <UseField
            path="recurringSchedule.count"
            componentProps={{
              'data-test-subj': 'count-field',
              id: 'count',
              euiFieldProps: {
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
          recurringSummary(moment(startDate), recurringSchedule, presets)
        )}
      </EuiSplitPanel.Inner>
    </EuiSplitPanel.Outer>
  );
});
RecurringSchedule.displayName = 'RecurringSchedule';
