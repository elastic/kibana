/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { Frequency } from '@kbn/rrule';
import moment from 'moment';
import { css } from '@emotion/react';
import {
  FIELD_TYPES,
  getUseField,
  useFormData,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import {
  Field,
  MultiButtonGroupFieldValue,
} from '@kbn/es-ui-shared-plugin/static/forms/components';
import { EuiFlexGroup, EuiFlexItem, EuiFormLabel, EuiSpacer } from '@elastic/eui';
import { CREATE_FORM_CUSTOM_FREQUENCY, WEEKDAY_OPTIONS } from '../../constants';
import * as i18n from '../../translations';
import { getInitialByWeekday } from '../../helpers/get_initial_by_weekday';
import { getWeekdayInfo } from '../../helpers/get_weekday_info';
import { FormProps } from '../schema';

const UseField = getUseField({ component: Field });

const styles = {
  flexField: css`
    .euiFormRow__labelWrapper {
      margin-bottom: unset;
    }
  `,
};

export const CustomRecurringSchedule: React.FC = React.memo(() => {
  const [{ startDate, recurringSchedule }] = useFormData<FormProps>({
    watch: [
      'startDate',
      'recurringSchedule.frequency',
      'recurringSchedule.interval',
      'recurringSchedule.customFrequency',
    ],
  });

  const frequencyOptions = useMemo(
    () => CREATE_FORM_CUSTOM_FREQUENCY(recurringSchedule?.interval),
    [recurringSchedule?.interval]
  );

  const bymonthOptions = useMemo(() => {
    if (!startDate) return [];
    const date = moment(startDate);
    const { dayOfWeek, nthWeekdayOfMonth, isLastOfMonth } = getWeekdayInfo(date, 'ddd');
    return [
      {
        id: 'day',
        label: i18n.CREATE_FORM_CUSTOM_REPEAT_MONTHLY_ON_DAY(date),
      },
      {
        id: 'weekday',
        label: i18n.CREATE_FORM_WEEKDAY_SHORT(dayOfWeek)[isLastOfMonth ? 0 : nthWeekdayOfMonth],
      },
    ];
  }, [startDate]);

  const defaultByWeekday = useMemo(() => getInitialByWeekday([], moment(startDate)), [startDate]);

  return (
    <>
      {recurringSchedule?.frequency !== Frequency.DAILY ? (
        <>
          <EuiSpacer size="s" />
          <EuiFlexGroup gutterSize="s" alignItems="flexStart">
            <EuiFlexItem>
              <UseField
                path="recurringSchedule.interval"
                css={styles.flexField}
                componentProps={{
                  'data-test-subj': 'interval-field',
                  id: 'interval',
                  euiFieldProps: {
                    min: 1,
                    prepend: (
                      <EuiFormLabel htmlFor={'interval'}>
                        {i18n.CREATE_FORM_INTERVAL_EVERY}
                      </EuiFormLabel>
                    ),
                  },
                }}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <UseField
                path="recurringSchedule.customFrequency"
                componentProps={{
                  'data-test-subj': 'custom-frequency-field',
                  euiFieldProps: {
                    options: frequencyOptions,
                  },
                }}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="s" />
        </>
      ) : null}
      {Number(recurringSchedule?.customFrequency) === Frequency.WEEKLY ||
      recurringSchedule?.frequency === Frequency.DAILY ? (
        <UseField
          path="recurringSchedule.byweekday"
          config={{
            type: FIELD_TYPES.MULTI_BUTTON_GROUP,
            label: '',
            validations: [
              {
                validator: ({ value }) => {
                  if (
                    Object.values(value as MultiButtonGroupFieldValue).every((v) => v === false)
                  ) {
                    return {
                      message: i18n.CREATE_FORM_BYWEEKDAY_REQUIRED,
                    };
                  }
                },
              },
            ],
            defaultValue: defaultByWeekday,
          }}
          componentProps={{
            'data-test-subj': 'byweekday-field',
            euiFieldProps: {
              legend: 'Repeat on weekday',
              options: WEEKDAY_OPTIONS,
            },
          }}
        />
      ) : null}

      {Number(recurringSchedule?.customFrequency) === Frequency.MONTHLY ? (
        <UseField
          path="recurringSchedule.bymonth"
          componentProps={{
            'data-test-subj': 'bymonth-field',
            euiFieldProps: {
              legend: 'Repeat on weekday or month day',
              options: bymonthOptions,
            },
          }}
        />
      ) : null}
    </>
  );
});
CustomRecurringSchedule.displayName = 'CustomRecurringSchedule';
