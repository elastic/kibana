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
  const dateFormat = getUiSettings().get('dateFormat', 'MMM D, YYYY @ HH:mm:ss');
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
    ticks.push({
      value: tick,
      label: moment.tz(tick, timezone).format(format),
    });
    tick += interval;
  }

  return ticks;
}

export function newTicks(min: number, max: number, interval: number): EuiRangeTick[] {
  const format = getScaledDateFormat(interval);
  const timezone = getTimezone();
  let ticks = [];
  for (let i = min; i <= max + interval / 2; i += interval) {
    ticks.push({
      value: i,
      label: moment.tz(i, timezone).format(format),
    });
  }

  const maxTicks = 20;
  let filteredArr: Array<{ value: number; label: string }> = [];
  if (ticks.length > maxTicks) {
    const nth = Math.ceil(ticks.length / maxTicks);
    filteredArr = ticks.filter(function (_value, index) {
      return index % nth === 0;
    });
    if (filteredArr.length === maxTicks - 1) {
      filteredArr.push(ticks[ticks.length - 1]);
    }
    ticks = filteredArr;
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
  let value: Array<{ label: string; ms: number }> = [];

  switch (true) {
    case timeRange > moment.duration(2, 'y').asMilliseconds():
      value = RANGE.slice(0, 3);
      break;

    case timeRange < moment.duration(2, 'y').asMilliseconds() &&
      timeRange > moment.duration(2, 'M').asMilliseconds():
      value = RANGE.slice(3, 6);
      break;

    case timeRange < moment.duration(2, 'M').asMilliseconds() &&
      timeRange > moment.duration(2, 'd').asMilliseconds():
      value = RANGE.slice(4, 7);
      break;

    case timeRange < moment.duration(2, 'd').asMilliseconds() &&
      timeRange > moment.duration(2, 'h').asMilliseconds():
      value = RANGE.slice(8, 12);
      break;

    case timeRange < moment.duration(2, 'h').asMilliseconds():
      value = RANGE.slice(9, 13);
      break;
  }

  return value;
}
