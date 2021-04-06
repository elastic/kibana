/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment-timezone';
import { EuiRangeTick } from '@elastic/eui';
import { getTimeFilter, getUiSettings } from '../../kibana_services';

function getTimezone() {
  const detectedTimezone = moment.tz.guess();
  const dateFormatTZ = getUiSettings().get('dateFormat:tz', 'Browser');

  return dateFormatTZ === 'Browser' ? detectedTimezone : dateFormatTZ;
}

function getScaledDateFormat(interval: number): string {
  if (interval >= moment.duration(1, 'y')) {
    return 'YYYY';
  }

  if (interval >= moment.duration(1, 'd')) {
    return 'MMM D';
  }

  if (interval >= moment.duration(12, 'h')) {
    return 'MMM D HH';
  }

  if (interval >= moment.duration(3, 'h')) {
    return 'D HH';
  }

  if (interval >= moment.duration(1, 'h')) {
    return 'HH';
  }

  if (interval >= moment.duration(1, 'm')) {
    return 'HH:mm';
  }

  if (interval >= moment.duration(1, 's')) {
    return 'HH:mm:ss';
  }

  return 'HH:mm:ss.SSS';
}

export function epochToKbnDateFormat(epoch: number): string {
  const dateFormat = getUiSettings().get('dateFormat', 'MMM D, YYYY @ HH:mm:ss.SSS');
  const timezone = getTimezone();
  return moment.tz(epoch, timezone).format(dateFormat);
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
