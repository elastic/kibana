/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { getUseField, useFormData } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { Field } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { CREATE_FORM_CUSTOM_FREQUENCY, Frequency, WEEKDAY_OPTIONS } from '../../constants';
import * as i18n from '../../translations';
import { ButtonGroupField } from '../fields/button_group_field';
import { getInitialByWeekday } from '../../helpers/get_initial_by_weekday';
import { getWeekdayInfo } from '../../helpers/get_weekday_info';

const UseField = getUseField({ component: Field });

export const CustomRecurringSchedule: React.FC = React.memo(() => {
  const displayProps = {
    display: 'columnCompressed',
    style: { alignItems: 'center' },
  };

  const [{ date: startDate, recurringSchedule }] = useFormData({
    watch: [
      'date',
      'recurringSchedule.frequency',
      'recurringSchedule.count',
      'recurringSchedule.customFrequency',
    ],
  });

  const frequencyOptions = useMemo(
    () => CREATE_FORM_CUSTOM_FREQUENCY(recurringSchedule.count),
    [recurringSchedule.count]
  );

  const bymonthOptions = useMemo(() => {
    if (!startDate) return [];
    const { dayOfWeek, nthWeekdayOfMonth, isLastOfMonth } = getWeekdayInfo(startDate, 'ddd');
    return [
      {
        id: 'day',
        label: i18n.CREATE_FORM_CUSTOM_REPEAT_MONTHLY_ON_DAY(startDate),
      },
      {
        id: 'weekday',
        label: i18n.CREATE_FORM_WEEKDAY_SHORT(dayOfWeek!)[isLastOfMonth ? 0 : nthWeekdayOfMonth!],
      },
    ];
  }, [startDate]);

  const defaultByWeekday = useMemo(() => getInitialByWeekday([], startDate), [startDate]);

  return (
    <>
      {recurringSchedule?.frequency === 'CUSTOM' ? (
        <>
          <EuiSpacer size="s" />
          <EuiFlexGroup gutterSize="s" alignItems="flexEnd">
            <EuiFlexItem grow={2} />
            <EuiFlexItem grow={4}>
              <UseField
                path="recurringSchedule.interval"
                componentProps={{
                  euiFieldProps: {
                    type: 'number',
                    min: 1,
                    prepend: i18n.CREATE_FORM_INTERVAL_EVERY,
                    compressed: true,
                  },
                }}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={4}>
              <UseField
                path="recurringSchedule.customFrequency"
                componentProps={{
                  euiFieldProps: {
                    options: frequencyOptions,
                    compressed: true,
                  },
                  display: 'compressed',
                }}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="s" />
        </>
      ) : null}
      {recurringSchedule?.customFrequency === Frequency.WEEKLY ||
      recurringSchedule?.frequency === Frequency.DAILY ? (
        <UseField
          className="recurringScheduleField"
          path="recurringSchedule.byweekday"
          config={{ label: ' ', validations: [], defaultValue: defaultByWeekday }}
          component={ButtonGroupField}
          componentProps={{
            legend: 'Repeat on weekday',
            options: WEEKDAY_OPTIONS,
            type: 'multi',
            ...displayProps,
          }}
        />
      ) : null}

      {recurringSchedule?.customFrequency === Frequency.MONTHLY ? (
        <UseField
          className="recurringScheduleField"
          path="recurringSchedule.bymonth"
          config={{ label: ' ', validations: [], defaultValue: 'day' }}
          component={ButtonGroupField}
          componentProps={{
            legend: 'Repeat on weekday or month day',
            options: bymonthOptions,
            ...displayProps,
          }}
        />
      ) : null}
    </>
  );
});
CustomRecurringSchedule.displayName = 'CustomRecurringSchedule';
