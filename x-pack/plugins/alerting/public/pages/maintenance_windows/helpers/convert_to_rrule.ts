/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Moment } from 'moment';
import { Frequency } from '@kbn/rrule';
import { ISO_WEEKDAYS_TO_RRULE } from '../constants';
import { getNthByWeekday } from './get_nth_by_weekday';
import { RecurringScheduleFormProps } from '../components/schema';
import { getPresets } from './get_presets';
import { RRuleParams } from '../../../../common';

export const convertToRRule = (
  startDate: Moment,
  timezone: string,
  recurringForm?: RecurringScheduleFormProps
): RRuleParams => {
  const presets = getPresets(startDate);

  const rRule: RRuleParams = {
    dtstart: startDate.toISOString(),
    tzid: timezone,
  };

  if (!recurringForm)
    return {
      ...rRule,
      // default to yearly and a count of 1
      // if the maintenance window is not recurring
      freq: Frequency.YEARLY,
      count: 1,
    };

  let form = recurringForm;
  if (recurringForm.frequency !== 'CUSTOM') {
    form = { ...recurringForm, ...presets[recurringForm.frequency] };
  }

  const frequency = form.customFrequency ?? (form.frequency as Frequency);
  rRule.freq = frequency;

  rRule.interval = form.interval;

  if (form.until) {
    rRule.until = form.until;
  }

  if (form.count) {
    rRule.count = form.count;
  }

  if (form.byweekday) {
    const byweekday = form.byweekday;
    rRule.byweekday = Object.keys(byweekday)
      .filter((k) => byweekday[k] === true)
      .map((n) => ISO_WEEKDAYS_TO_RRULE[Number(n)]);
  }

  if (form.bymonth) {
    if (form.bymonth === 'day') {
      rRule.bymonthday = [startDate.date()];
    } else if (form.bymonth === 'weekday') {
      rRule.byweekday = [getNthByWeekday(startDate)];
    }
  }

  if (frequency === Frequency.YEARLY) {
    // rRule expects 1 based indexing for months
    rRule.bymonth = [startDate.month() + 1];
    rRule.bymonthday = [startDate.date()];
  }

  return rRule;
};
