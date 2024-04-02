/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { Frequency } from '@kbn/rrule';
import { has } from 'lodash';
import type { FormProps, RecurringScheduleFormProps } from '../components/schema';
import type { RRuleParams, MaintenanceWindow } from '../../../../common';
import { EndsOptions, MaintenanceWindowFrequency } from '../constants';
import { getInitialByWeekday } from './get_initial_by_weekday';

export const convertFromMaintenanceWindowToForm = (
  maintenanceWindow: MaintenanceWindow
): FormProps => {
  const startDate = maintenanceWindow.rRule.dtstart;
  const endDate = moment(startDate).add(maintenanceWindow.duration);
  // maintenance window is considered recurring if interval is defined
  const recurring = has(maintenanceWindow, 'rRule.interval');
  const form: FormProps = {
    title: maintenanceWindow.title,
    startDate,
    endDate: endDate.toISOString(),
    timezone: [maintenanceWindow.rRule.tzid],
    recurring,
    categoryIds: maintenanceWindow.categoryIds || [],
    scopedQuery: maintenanceWindow.scopedQuery,
  };
  if (!recurring) return form;

  const rRule = maintenanceWindow.rRule;
  const isCustomFrequency = isCustom(rRule);
  const frequency = rRule.freq as MaintenanceWindowFrequency;
  const ends = rRule.until
    ? EndsOptions.ON_DATE
    : rRule.count
    ? EndsOptions.AFTER_X
    : EndsOptions.NEVER;

  const recurringSchedule: RecurringScheduleFormProps = {
    frequency: isCustomFrequency ? 'CUSTOM' : frequency,
    interval: rRule.interval,
    ends,
  };

  if (isCustomFrequency) {
    recurringSchedule.customFrequency = frequency;
  }

  if (rRule.until) {
    recurringSchedule.until = rRule.until;
  }
  if (rRule.count) {
    recurringSchedule.count = rRule.count;
  }
  if (frequency !== Frequency.MONTHLY && rRule.byweekday) {
    recurringSchedule.byweekday = getInitialByWeekday(
      rRule.byweekday as string[],
      moment(startDate)
    );
  }
  if (frequency === Frequency.MONTHLY) {
    if (rRule.byweekday) {
      recurringSchedule.bymonth = 'weekday';
    } else if (rRule.bymonthday) {
      recurringSchedule.bymonth = 'day';
    }
  }

  form.recurringSchedule = recurringSchedule;

  return form;
};

const isCustom = (rRule: RRuleParams) => {
  const freq = rRule.freq;
  // interval is greater than 1
  if (rRule.interval && rRule.interval > 1) {
    return true;
  }
  // frequency is daily and no weekdays are selected
  if (freq && freq === Frequency.DAILY && !rRule.byweekday) {
    return true;
  }
  // frequency is weekly and there are multiple weekdays selected
  if (freq && freq === Frequency.WEEKLY && rRule.byweekday && rRule.byweekday.length > 1) {
    return true;
  }
  // frequency is monthly and by month day is selected
  if (freq && freq === Frequency.MONTHLY && rRule.bymonthday) {
    return true;
  }
  return false;
};
