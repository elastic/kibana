/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { i18n } from '@kbn/i18n';
import { TimeRangeComparisonEnum } from '../../../../common/runtime_types/comparison_type_rt';
import { getTimeRangeComparison } from './get_time_range_comparison';

const eightDaysInHours = moment.duration(8, 'd').asHours();

function getDateFormat({
  previousPeriodStart,
  currentPeriodEnd,
}: {
  previousPeriodStart?: string;
  currentPeriodEnd?: string;
}) {
  const momentPreviousPeriodStart = moment(previousPeriodStart);
  const momentCurrentPeriodEnd = moment(currentPeriodEnd);
  const isDifferentYears =
    momentPreviousPeriodStart.get('year') !==
    momentCurrentPeriodEnd.get('year');
  return isDifferentYears ? 'DD/MM/YY HH:mm' : 'DD/MM HH:mm';
}

function formatDate({
  dateFormat,
  previousPeriodStart,
  previousPeriodEnd,
}: {
  dateFormat: string;
  previousPeriodStart?: string;
  previousPeriodEnd?: string;
}) {
  const momentStart = moment(previousPeriodStart);
  const momentEnd = moment(previousPeriodEnd);
  return `${momentStart.format(dateFormat)} - ${momentEnd.format(dateFormat)}`;
}

function getSelectOptions({
  comparisonTypes,
  start,
  end,
}: {
  comparisonTypes: TimeRangeComparisonEnum[];
  start?: string;
  end?: string;
}) {
  return comparisonTypes.map((value) => {
    switch (value) {
      case TimeRangeComparisonEnum.DayBefore: {
        return {
          value,
          text: i18n.translate('xpack.apm.timeComparison.select.dayBefore', {
            defaultMessage: 'Day before',
          }),
        };
      }
      case TimeRangeComparisonEnum.WeekBefore: {
        return {
          value,
          text: i18n.translate('xpack.apm.timeComparison.select.weekBefore', {
            defaultMessage: 'Week before',
          }),
        };
      }
      case TimeRangeComparisonEnum.PeriodBefore: {
        const { comparisonStart, comparisonEnd } = getTimeRangeComparison({
          comparisonType: TimeRangeComparisonEnum.PeriodBefore,
          start,
          end,
          comparisonEnabled: true,
        });

        const dateFormat = getDateFormat({
          previousPeriodStart: comparisonStart,
          currentPeriodEnd: end,
        });

        return {
          value,
          text: formatDate({
            dateFormat,
            previousPeriodStart: comparisonStart,
            previousPeriodEnd: comparisonEnd,
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
  const hourDiff = momentEnd.diff(momentStart, 'h', true);

  let comparisonTypes: TimeRangeComparisonEnum[];

  if (hourDiff < 25) {
    // Less than 25 hours. This is because relative times may be rounded when
    // asking for a day, which can result in a duration > 24h. (e.g. rangeFrom: 'now-24h/h, rangeTo: 'now')
    comparisonTypes = [
      TimeRangeComparisonEnum.DayBefore,
      TimeRangeComparisonEnum.WeekBefore,
    ];
  } else if (hourDiff < eightDaysInHours) {
    // Less than 8 days. This is because relative times may be rounded when
    // asking for a week, which can result in a duration > 7d. (e.g. rangeFrom: 'now-7d/d, rangeTo: 'now')
    comparisonTypes = [TimeRangeComparisonEnum.WeekBefore];
  } else {
    comparisonTypes = [TimeRangeComparisonEnum.PeriodBefore];
  }

  return getSelectOptions({ comparisonTypes, start, end });
}
