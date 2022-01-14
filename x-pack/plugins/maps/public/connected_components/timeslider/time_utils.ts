/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment-timezone';
import { i18n } from '@kbn/i18n';
import { EuiRangeTick } from '@elastic/eui/src/components/form/range/range_ticks';
import { calcAutoIntervalNear, TimeRangeBounds } from '../../../../../../src/plugins/data/common';
import { getUiSettings } from '../../kibana_services';

function getTimezone() {
  const detectedTimezone = moment.tz.guess();
  const dateFormatTZ = getUiSettings().get('dateFormat:tz', 'Browser');

  return dateFormatTZ === 'Browser' ? detectedTimezone : dateFormatTZ;
}

function getScaledDateFormat(interval: number): string {
  if (interval >= moment.duration(1, 'y').asMilliseconds()) {
    return 'YYYY';
  }

  if (interval >= moment.duration(1, 'd').asMilliseconds()) {
    return 'MMM D';
  }

  if (interval >= moment.duration(6, 'h').asMilliseconds()) {
    return 'Do HH';
  }

  if (interval >= moment.duration(1, 'h').asMilliseconds()) {
    return 'HH:mm';
  }

  if (interval >= moment.duration(1, 'm').asMilliseconds()) {
    return 'HH:mm';
  }

  if (interval >= moment.duration(1, 's').asMilliseconds()) {
    return 'mm:ss';
  }

  return 'ss.SSS';
}

export function epochToKbnDateFormat(epoch: number): string {
  const dateFormat = getUiSettings().get('dateFormat', 'MMM D, YYYY @ HH:mm:ss.SSS');
  const timezone = getTimezone();
  return moment.tz(epoch, timezone).format(dateFormat);
}

export function getInterval(min: number, max: number, steps = 6): number {
  const duration = max - min;
  let interval = calcAutoIntervalNear(steps, duration).asMilliseconds();
  // Sometimes auto interval is not quite right and returns 2X or 3X requested ticks
  // Adjust the interval to get closer to the requested number of ticks
  const actualSteps = duration / interval;
  if (actualSteps > steps * 1.5) {
    const factor = Math.round(actualSteps / steps);
    interval *= factor;
  } else if (actualSteps < 5) {
    interval *= 0.5;
  }
  return interval;
}

export function getTicks(min: number, max: number, interval: number): EuiRangeTick[] {
  const format = getScaledDateFormat(interval);
  const timezone = getTimezone();

  let tick = Math.ceil(min / interval) * interval;
  const ticks: EuiRangeTick[] = [];
  while (tick < max) {
    let value = tick;
    let label = moment.tz(tick, timezone).format(format);

    if (max - min > moment.duration(2, 'd').asMilliseconds()) {
      value = moment(tick).startOf('day').valueOf();
      label = moment.tz(moment(tick).startOf('day').valueOf(), timezone).format(format);
    }

    ticks.push({
      value,
      label,
    });
    tick += interval;
  }

  return ticks;
}

export const RANGE = [
  {
    label: i18n.translate('xpack.maps.timeslider.label1Year', { defaultMessage: '1 year' }),
    ms: moment.duration(1, 'y').asMilliseconds(),
  },
  {
    label: i18n.translate('xpack.maps.timeslider.label6Month', { defaultMessage: '6 months' }),
    ms: moment.duration(6, 'M').asMilliseconds(),
  },
  {
    label: i18n.translate('xpack.maps.timeslider.label3month', { defaultMessage: '3 months' }),
    ms: moment.duration(3, 'M').asMilliseconds(),
  },
  {
    label: i18n.translate('xpack.maps.timeslider.label1month', { defaultMessage: '1 month' }),
    ms: moment.duration(1, 'M').asMilliseconds(),
  },
  {
    label: i18n.translate('xpack.maps.timeslider.labelDay', { defaultMessage: '1 day' }),
    ms: moment.duration(1, 'd').asMilliseconds(),
  },
  {
    label: i18n.translate('xpack.maps.timeslider.label12Hours', { defaultMessage: '12 hours' }),
    ms: moment.duration(12, 'h').asMilliseconds(),
  },
  {
    label: i18n.translate('xpack.maps.timeslider.label6Hours', { defaultMessage: '6 hours' }),
    ms: moment.duration(6, 'h').asMilliseconds(),
  },
  {
    label: i18n.translate('xpack.maps.timeslider.label3Hours', { defaultMessage: '3 hours' }),
    ms: moment.duration(3, 'h').asMilliseconds(),
  },
  {
    label: i18n.translate('xpack.maps.timeslider.label1Hour', { defaultMessage: '1 hour' }),
    ms: moment.duration(1, 'h').asMilliseconds(),
  },
  {
    label: i18n.translate('xpack.maps.timeslider.label30Minutes', { defaultMessage: '30 minutes' }),
    ms: moment.duration(30, 'm').asMilliseconds(),
  },
  {
    label: i18n.translate('xpack.maps.timeslider.label15Minutes', { defaultMessage: '15 minutes' }),
    ms: moment.duration(15, 'm').asMilliseconds(),
  },
  {
    label: i18n.translate('xpack.maps.timeslider.label10Minutes', { defaultMessage: '10 minutes' }),
    ms: moment.duration(10, 'm').asMilliseconds(),
  },
  {
    label: i18n.translate('xpack.maps.timeslider.label5Minutes', { defaultMessage: '5 minutes' }),
    ms: moment.duration(5, 'm').asMilliseconds(),
  },
  {
    label: i18n.translate('xpack.maps.timeslider.label1Minute', { defaultMessage: '1 minute' }),
    ms: moment.duration(1, 'm').asMilliseconds(),
  },
];

export function getTimeRanges(timeRangeBounds: TimeRangeBounds) {
  if (timeRangeBounds.min === undefined || timeRangeBounds.max === undefined) {
    throw new Error(
      'Unable to create Timeslider component, timeRangeBounds min or max are undefined'
    );
  }
  const min = timeRangeBounds.min.valueOf();
  const max = timeRangeBounds.max.valueOf();
  const timeRange = max - min;
  const interval = getInterval(min, max, 20);

  return RANGE.filter((range) => {
    return timeRange > range.ms && range.ms >= interval;
  });
}

export function durationAsString(ms: number, maxPrecission = 3) {
  const duration = moment.duration(ms);
  const items = [
    { timeUnit: 'years', value: Math.floor(duration.asYears()) },
    { timeUnit: 'months', value: Math.floor(duration.asMonths()) },
    { timeUnit: 'days', value: Math.floor(duration.asDays()) },
    { timeUnit: 'hours', value: Math.floor(duration.hours()) },
    { timeUnit: 'minutes', value: Math.floor(duration.minutes()) },
  ];

  const formattedItems = items.reduce((accumulator: string[], { value, timeUnit }) => {
    if (accumulator.length >= maxPrecission || (accumulator.length === 0 && value === 0)) {
      return accumulator;
    }

    if (value !== 0) {
      accumulator.push(value + ' ' + timeUnit);
    }
    return accumulator;
  }, []);

  return formattedItems.length !== 0 ? formattedItems.join(' ') : '-';
}
