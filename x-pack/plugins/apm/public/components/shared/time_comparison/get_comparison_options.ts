/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { i18n } from '@kbn/i18n';
import { getOffsetInMs } from '../../../../common/utils/get_offset_in_ms';

export enum TimeRangeComparisonEnum {
  WeekBefore = 'week',
  DayBefore = 'day',
  PeriodBefore = 'period',
}

export const dayAndWeekBeforeToOffsetMap = {
  [TimeRangeComparisonEnum.DayBefore]: '1d',
  [TimeRangeComparisonEnum.WeekBefore]: '1w',
} as const;

const twentyFiveHoursInMs = moment.duration(25, 'h').asMilliseconds();
const eightDaysInMs = moment.duration(8, 'd').asMilliseconds();

function formatDate({
  currentPeriodEnd,
  previousPeriodStart,
  previousPeriodEnd,
}: {
  currentPeriodEnd: moment.Moment;
  previousPeriodStart: moment.Moment;
  previousPeriodEnd: moment.Moment;
}) {
  const isDifferentYears =
    previousPeriodStart.get('year') !== currentPeriodEnd.get('year');
  const dateFormat = isDifferentYears ? 'DD/MM/YY HH:mm' : 'DD/MM HH:mm';

  return `${previousPeriodStart.format(
    dateFormat
  )} - ${previousPeriodEnd.format(dateFormat)}`;
}

function getSelectOptions({
  comparisonTypes,
  start,
  end,
  msDiff,
}: {
  comparisonTypes: TimeRangeComparisonEnum[];
  start: moment.Moment;
  end: moment.Moment;
  msDiff: number;
}) {
  return comparisonTypes.map((value) => {
    switch (value) {
      case TimeRangeComparisonEnum.DayBefore: {
        return {
          value: dayAndWeekBeforeToOffsetMap[TimeRangeComparisonEnum.DayBefore],
          text: i18n.translate('xpack.apm.timeComparison.select.dayBefore', {
            defaultMessage: 'Day before',
          }),
        };
      }
      case TimeRangeComparisonEnum.WeekBefore: {
        return {
          value:
            dayAndWeekBeforeToOffsetMap[TimeRangeComparisonEnum.WeekBefore],
          text: i18n.translate('xpack.apm.timeComparison.select.weekBefore', {
            defaultMessage: 'Week before',
          }),
        };
      }
      case TimeRangeComparisonEnum.PeriodBefore: {
        const offset = `${msDiff}ms`;

        const { startWithOffset, endWithOffset } = getOffsetInMs({
          start: start.valueOf(),
          end: end.valueOf(),
          offset,
        });

        return {
          value: offset,
          text: formatDate({
            currentPeriodEnd: end,
            previousPeriodStart: moment(startWithOffset),
            previousPeriodEnd: moment(endWithOffset),
          }),
        };
      }
    }
  });
}

export function getComparisonOptions({
  start,
  end,
}: {
  start?: string;
  end?: string;
}) {
  const momentStart = moment(start);
  const momentEnd = moment(end);
  const msDiff = momentEnd.diff(momentStart, 'ms', true);

  let comparisonTypes: TimeRangeComparisonEnum[];

  if (msDiff < twentyFiveHoursInMs) {
    // Less than 25 hours. This is because relative times may be rounded when
    // asking for a day, which can result in a duration > 24h. (e.g. rangeFrom: 'now-24h/h, rangeTo: 'now')
    comparisonTypes = [
      TimeRangeComparisonEnum.DayBefore,
      TimeRangeComparisonEnum.WeekBefore,
    ];
  } else if (msDiff < eightDaysInMs) {
    // Less than 8 days. This is because relative times may be rounded when
    // asking for a week, which can result in a duration > 7d. (e.g. rangeFrom: 'now-7d/d, rangeTo: 'now')
    comparisonTypes = [TimeRangeComparisonEnum.WeekBefore];
  } else {
    comparisonTypes = [TimeRangeComparisonEnum.PeriodBefore];
  }

  return getSelectOptions({
    comparisonTypes,
    start: momentStart,
    end: momentEnd,
    msDiff,
  });
}
