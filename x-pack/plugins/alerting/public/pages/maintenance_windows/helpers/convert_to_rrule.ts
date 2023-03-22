/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Moment } from 'moment';
import { RRule, RRuleFrequencyMap } from '../types';
import { Frequency, ISO_WEEKDAYS_TO_STRING } from '../constants';
import { getNthByWeekday } from './get_nth_by_weekday';
import { RecurringScheduleFormProps } from '../components/schema';
import { getPresets } from './get_presets';

export const convertToRRule = (startDate: Moment, form: RecurringScheduleFormProps): RRule => {
  const presets = getPresets(startDate);

  const rRule: RRule = {
    dtstart: startDate.toISOString(),
    tzid: 'UTC',
  };

  if (form) {
    if (form.frequency !== 'CUSTOM') {
      form = { ...form, ...presets[form.frequency] };
    }
    const frequency = form.frequency === 'CUSTOM' ? form.customFrequency : form.frequency;
    rRule.freq = RRuleFrequencyMap[frequency];

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
        .map((n) => ISO_WEEKDAYS_TO_STRING[Number(n)]);
    }

    if (form.bymonth) {
      if (form.bymonth === 'day') {
        rRule.bymonthday = [startDate.date()];
      } else if (form.bymonth === 'weekday') {
        rRule.byweekday = [getNthByWeekday(startDate)];
      }
    }

    if (form.customFrequency === Frequency.YEARLY) {
      rRule.bymonth = [startDate.month()];
      rRule.bymonthday = [startDate.date()];
    }
  }

  return rRule;
};
