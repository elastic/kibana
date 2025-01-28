/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment, { Moment } from 'moment';
import { Frequency } from '@kbn/rrule';
import * as i18n from '../translations';
import {
  MaintenanceWindowFrequency,
  ISO_WEEKDAYS_TO_RRULE,
  RRULE_WEEKDAYS_TO_ISO_WEEKDAYS,
} from '../constants';
import { monthDayDate } from './month_day_date';
import { getNthByWeekday } from './get_nth_by_weekday';
import { RecurringScheduleFormProps } from '../components/schema';

export const recurringSummary = (
  startDate: Moment,
  recurringSchedule: RecurringScheduleFormProps | undefined,
  presets: Record<MaintenanceWindowFrequency, Partial<RecurringScheduleFormProps>>
) => {
  if (!recurringSchedule) return '';

  let schedule = recurringSchedule;
  if (recurringSchedule.frequency !== 'CUSTOM') {
    schedule = { ...recurringSchedule, ...presets[recurringSchedule.frequency] };
  }

  const frequency = schedule.customFrequency ?? (schedule.frequency as MaintenanceWindowFrequency);
  const interval = schedule.interval || 1;
  const frequencySummary = i18n.CREATE_FORM_FREQUENCY_SUMMARY(interval)[frequency];

  // daily and weekly
  let weeklySummary = null;
  let dailyWeekdaySummary = null;
  let dailyWithWeekdays = false;
  const byweekday = schedule.byweekday;
  if (byweekday) {
    const weekdays = Object.keys(byweekday)
      .filter((k) => byweekday[k] === true)
      .map((n) => ISO_WEEKDAYS_TO_RRULE[Number(n)]);
    const formattedWeekdays = weekdays.map((weekday) => toWeekdayName(weekday)).join(', ');

    weeklySummary = i18n.CREATE_FORM_WEEKLY_SUMMARY(formattedWeekdays);
    dailyWeekdaySummary = formattedWeekdays;

    dailyWithWeekdays = frequency === Frequency.DAILY;
  }

  // monthly
  let monthlySummary = null;
  const bymonth = schedule.bymonth;
  if (bymonth) {
    if (bymonth === 'weekday') {
      const nthWeekday = getNthByWeekday(startDate);
      const nth = nthWeekday.startsWith('-1') ? 0 : Number(nthWeekday[1]);
      monthlySummary = i18n.CREATE_FORM_WEEKDAY_SHORT(toWeekdayName(nthWeekday))[nth];
      monthlySummary = monthlySummary[0].toLocaleLowerCase() + monthlySummary.slice(1);
    } else if (bymonth === 'day') {
      monthlySummary = i18n.CREATE_FORM_MONTHLY_BY_DAY_SUMMARY(startDate.date());
    }
  }

  // yearly
  const yearlyByMonthSummary = i18n.CREATE_FORM_YEARLY_BY_MONTH_SUMMARY(
    monthDayDate(moment().month(startDate.month()).date(startDate.date()))
  );

  const onSummary = dailyWithWeekdays
    ? dailyWeekdaySummary
    : frequency === Frequency.WEEKLY
    ? weeklySummary
    : frequency === Frequency.MONTHLY
    ? monthlySummary
    : frequency === Frequency.YEARLY
    ? yearlyByMonthSummary
    : null;

  const untilSummary = schedule.until
    ? i18n.CREATE_FORM_UNTIL_DATE_SUMMARY(moment(schedule.until).format('LL'))
    : schedule.count
    ? i18n.CREATE_FORM_OCURRENCES_SUMMARY(schedule.count)
    : null;

  const every = i18n
    .CREATE_FORM_RECURRING_SUMMARY(
      !dailyWithWeekdays ? frequencySummary : null,
      onSummary,
      untilSummary
    )
    .trim();

  return every;
};

export const toWeekdayName = (weekday: string) =>
  moment().isoWeekday(RRULE_WEEKDAYS_TO_ISO_WEEKDAYS[weekday.slice(-2)]).format('dddd');
