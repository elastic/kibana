/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import moment, { Moment } from 'moment';

import { ISO_WEEKDAYS } from '@kbn/alerting-plugin/common';
import { RecurrenceSchedule, RRuleFrequency } from '../../../../../../types';
import { i18nMonthDayDate } from '../../../../../lib/i18n_month_day_date';
import { ISO_WEEKDAYS_TO_RRULE, RRULE_WEEKDAYS_TO_ISO_WEEKDAYS } from './constants';
import { i18nFreqSummary, i18nNthWeekdayShort } from './translations';

export interface CustomFrequencyState {
  freq: RRuleFrequency;
  interval: number;
  byweekday?: string[];
  bymonthday: number[];
  bymonth: number[];
}

export const getWeekdayInfo = (date: Moment, dayOfWeekFmt: string = 'dddd') => {
  const dayOfWeek = date.format(dayOfWeekFmt);
  const nthWeekdayOfMonth = Math.ceil(date.date() / 7);
  const isLastOfMonth = nthWeekdayOfMonth > 4 || !date.isSame(moment(date).add(7, 'd'), 'month');
  return { dayOfWeek, nthWeekdayOfMonth, isLastOfMonth };
};

export const getInitialByweekday = (
  initialStateByweekday: CustomFrequencyState['byweekday'],
  date: Moment | null
) => {
  const dayOfWeek = date ? date.isoWeekday() : 1;
  return ISO_WEEKDAYS.reduce(
    (result, n) => ({
      ...result,
      [n]:
        initialStateByweekday && initialStateByweekday.length > 0
          ? initialStateByweekday
              // Sanitize nth day strings, e.g. +2MO, -1FR, into just days of the week
              .map((w) => w.replace(/[0-9+\-]/g, ''))
              .includes(ISO_WEEKDAYS_TO_RRULE[n])
          : n === dayOfWeek,
    }),
    {} as Record<string, boolean>
  );
};

export const generateNthByweekday = (startDate: Moment) => {
  const { isLastOfMonth, nthWeekdayOfMonth } = getWeekdayInfo(startDate);
  return [
    `${isLastOfMonth ? '-1' : '+' + nthWeekdayOfMonth}${
      ISO_WEEKDAYS_TO_RRULE[startDate.isoWeekday()]
    }`,
  ];
};

export const recurrenceSummary = ({
  freq,
  interval,
  until,
  count,
  byweekday,
  bymonthday,
  bymonth,
}: RecurrenceSchedule) => {
  const frequencySummary = i18nFreqSummary(interval)[freq];

  // For weekday summaries
  const firstWeekday = byweekday ? byweekday[0] : '';
  const nthWeekday = !firstWeekday
    ? null
    : firstWeekday.startsWith('+')
    ? Number(firstWeekday[1])
    : firstWeekday.startsWith('-1')
    ? 0
    : null;
  let byweekdaySummary =
    byweekday && byweekday.length > 0
      ? nthWeekday !== null
        ? i18nNthWeekdayShort(rRuleWeekdayToWeekdayName(firstWeekday))[nthWeekday]
        : i18n.translate('xpack.triggersActionsUI.ruleSnoozeScheduler.byweekdaySummary', {
            defaultMessage: 'on {weekdays}',
            values: {
              weekdays: byweekday
                .map((rRuleWeekday) => rRuleWeekdayToWeekdayName(rRuleWeekday))
                .join(', '),
            },
          })
      : null;
  if (byweekdaySummary)
    byweekdaySummary = byweekdaySummary[0].toLocaleLowerCase() + byweekdaySummary.slice(1);

  const bymonthdaySummary =
    bymonthday && bymonthday.length > 0
      ? i18n.translate('xpack.triggersActionsUI.ruleSnoozeScheduler.bymonthdaySummary', {
          defaultMessage: 'on day {monthday}',
          values: {
            monthday: bymonthday.join(', '),
          },
        })
      : null;

  const bymonthSummary =
    bymonth && bymonth.length > 0 && bymonthday && bymonthday.length > 0
      ? i18n.translate('xpack.triggersActionsUI.ruleSnoozeScheduler.bymonthSummary', {
          defaultMessage: 'on {date}',
          values: {
            date: i18nMonthDayDate(moment().month(bymonth[0]).date(bymonthday[0])),
          },
        })
      : null;

  const onSummary =
    freq === RRuleFrequency.WEEKLY
      ? byweekdaySummary
      : freq === RRuleFrequency.MONTHLY
      ? byweekdaySummary ?? bymonthdaySummary
      : freq === RRuleFrequency.YEARLY
      ? bymonthSummary
      : null;

  const untilSummary = until
    ? i18n.translate('xpack.triggersActionsUI.ruleSnoozeScheduler.untilDateSummary', {
        defaultMessage: 'until {date}',
        values: { date: moment(until).format('LL') },
      })
    : count
    ? i18n.translate('xpack.triggersActionsUI.ruleSnoozeScheduler.occurrencesSummary', {
        defaultMessage: 'for {count, plural, one {# occurrence} other {# occurrences}}',
        values: { count },
      })
    : null;

  const every = i18n.translate('xpack.triggersActionsUI.ruleSnoozeScheduler.recurrenceSummary', {
    defaultMessage: 'every {frequencySummary}{on}{until}',
    values: {
      frequencySummary,
      on: onSummary ? ` ${onSummary}` : '',
      until: untilSummary ? ` ${untilSummary}` : '',
    },
  });

  return every;
};

export const rRuleWeekdayToWeekdayName = (weekday: string) =>
  moment().isoWeekday(RRULE_WEEKDAYS_TO_ISO_WEEKDAYS[weekday.slice(-2)]).format('dddd');

export const buildCustomRecurrenceSchedulerState = ({
  frequency,
  interval,
  byweekday,
  monthlyRecurDay,
  startDate,
}: {
  frequency: RRuleFrequency;
  interval: number;
  byweekday: Record<string, boolean>;
  monthlyRecurDay: string;
  startDate: Moment | null;
}) => {
  const isMonthlyByDay = frequency === RRuleFrequency.MONTHLY && monthlyRecurDay === 'day';
  const isMonthlyByWeekday = frequency === RRuleFrequency.MONTHLY && monthlyRecurDay === 'weekday';
  const useByMonthDay = startDate && (isMonthlyByDay || frequency === RRuleFrequency.YEARLY);

  const configuredByweekday =
    // If weekly frequency is selected, pull byweekday from chosen days
    frequency === RRuleFrequency.WEEKLY
      ? Object.keys(byweekday)
          .filter((k) => byweekday[k] === true)
          .map((n) => ISO_WEEKDAYS_TO_RRULE[Number(n)])
      : // If monthly frequency is selected with the nth weekday option, pull byweekday from the configured startDate
      startDate && isMonthlyByWeekday
      ? generateNthByweekday(startDate)
      : [];

  const bymonthday = useByMonthDay ? [startDate.date()] : [];
  const bymonth = startDate && frequency === RRuleFrequency.YEARLY ? [startDate.month()] : [];
  return {
    freq: frequency,
    interval,
    byweekday: configuredByweekday,
    bymonthday,
    bymonth,
  };
};
