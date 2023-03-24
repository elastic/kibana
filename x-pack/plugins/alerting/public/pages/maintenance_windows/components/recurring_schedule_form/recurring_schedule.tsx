/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import moment from 'moment';
import { EuiHorizontalRule, EuiSplitPanel } from '@elastic/eui';
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
import { DateAndTimeField } from '../fields/date_and_time_field';
import { CustomRecurringSchedule } from './custom_recurring_schedule';
import { recurringSummary } from '../../helpers/recurring_summary';
import { getPresets } from '../../helpers/get_presets';
import './recurring_schedule.scss';

const UseField = getUseField({ component: Field });

export const RecurringSchedule: React.FC = React.memo(() => {
  const displayProps = {
    display: 'columnCompressed',
    style: { alignItems: 'center' },
  };

  const [{ date, recurringSchedule }] = useFormData({
    watch: [
      'date',
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
    if (!date) {
      return { options: DEFAULT_FREQUENCY_OPTIONS, presets: DEFAULT_PRESETS };
    }
    const startDate = moment(date);
    const { dayOfWeek, nthWeekdayOfMonth, isLastOfMonth } = getWeekdayInfo(startDate);
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
          text: i18n.CREATE_FORM_FREQUENCY_YEARLY_ON(startDate),
          value: Frequency.YEARLY,
        },
        {
          text: i18n.CREATE_FORM_FREQUENCY_CUSTOM,
          value: 'CUSTOM',
        },
      ],
      presets: getPresets(startDate),
    };
  }, [date]);

  return (
    <EuiSplitPanel.Outer hasShadow={false} hasBorder={true}>
      <EuiSplitPanel.Inner color="subdued">
        <UseField
          className="recurringScheduleField"
          path="recurringSchedule.frequency"
          componentProps={{
            'data-test-subj': 'frequency-field',
            euiFieldProps: {
              options,
              compressed: true,
              fullWidth: true,
            },
            ...displayProps,
          }}
        />
        {recurringSchedule?.frequency === Frequency.DAILY ||
        recurringSchedule?.frequency === 'CUSTOM' ? (
          <CustomRecurringSchedule data-test-subj="custom-recurring-form" />
        ) : null}
        <UseField
          className="recurringScheduleField"
          path="recurringSchedule.ends"
          component={ButtonGroupField}
          componentProps={{
            'data-test-subj': 'ends-field',
            legend: 'Recurrence ends',
            options: RECURRENCE_END_OPTIONS,
            ...displayProps,
          }}
        />
        {recurringSchedule?.ends === EndsOptions.ON_DATE ? (
          <UseField
            className="recurringScheduleField"
            path="recurringSchedule.until"
            component={DateAndTimeField}
            componentProps={{
              'data-test-subj': 'until-field',
              isDisabled: false,
              showTimeSelect: false,
              ...displayProps,
            }}
          />
        ) : null}
        {recurringSchedule?.ends === EndsOptions.AFTER_X ? (
          <UseField
            className="recurringScheduleField"
            path="recurringSchedule.count"
            componentProps={{
              'data-test-subj': 'count-field',
              euiFieldProps: {
                fullWidth: false,
                type: 'number',
                min: 1,
                prepend: i18n.CREATE_FORM_COUNT_AFTER,
                append: i18n.CREATE_FORM_COUNT_OCCURRENCE,
                compressed: true,
              },
              ...displayProps,
            }}
          />
        ) : null}
      </EuiSplitPanel.Inner>
      <EuiHorizontalRule margin="none" />
      <EuiSplitPanel.Inner>
        {i18n.CREATE_FORM_RECURRING_SUMMARY_PREFIX(
          recurringSummary(moment(date), recurringSchedule, presets)
        )}
      </EuiSplitPanel.Inner>
    </EuiSplitPanel.Outer>
  );
});
RecurringSchedule.displayName = 'RecurringSchedule';
