/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { useState } from 'react';

import { parseInterval } from '../../../../../../../common';
import { RecurrenceSchedule, SnoozeSchedule } from '../../../../../../types';
import { recurrenceSummary } from '../recurrence_scheduler/helpers';
import { SnoozeUnit } from './constants';
import { ONE } from './translations';

const PREV_SNOOZE_INTERVAL_KEY = 'triggersActionsUi_previousSnoozeInterval';
export const usePreviousSnoozeInterval: (
  p?: string | null
) => [string | null, (n: string) => void] = (propsInterval) => {
  let intervalFromStorage = localStorage.getItem(PREV_SNOOZE_INTERVAL_KEY);
  if (intervalFromStorage) {
    try {
      parseInterval(intervalFromStorage);
    } catch (e) {
      intervalFromStorage = null;
      localStorage.removeItem(PREV_SNOOZE_INTERVAL_KEY);
    }
  }
  const usePropsInterval = typeof propsInterval !== 'undefined';
  const interval = usePropsInterval ? propsInterval : intervalFromStorage;
  const [previousSnoozeInterval, setPreviousSnoozeInterval] = useState<string | null>(interval);
  const storeAndSetPreviousSnoozeInterval = (newInterval: string) => {
    if (!usePropsInterval) {
      localStorage.setItem(PREV_SNOOZE_INTERVAL_KEY, newInterval);
    }
    setPreviousSnoozeInterval(newInterval);
  };
  return [previousSnoozeInterval, storeAndSetPreviousSnoozeInterval];
};

export const futureTimeToInterval = (time?: Date | null) => {
  if (!time) return;
  const relativeTime = moment(time).locale('en').fromNow(true);
  const [valueStr, unitStr] = relativeTime.split(' ');
  let value = valueStr === 'a' || valueStr === 'an' ? 1 : parseInt(valueStr, 10);
  let unit;
  switch (unitStr) {
    case 'year':
    case 'years':
      unit = 'M';
      value = value * 12;
      break;
    case 'month':
    case 'months':
      unit = 'M';
      break;
    case 'day':
    case 'days':
      unit = 'd';
      break;
    case 'hour':
    case 'hours':
      unit = 'h';
      break;
    case 'minute':
    case 'minutes':
      unit = 'm';
      break;
  }

  if (!unit) return;
  return `${value}${unit}`;
};

export const durationToTextString = (value: number, unit: SnoozeUnit) => {
  // Moment.humanize will parse "1" as "a" or "an", e.g "an hour"
  // Override this to output "1 hour"
  if (value === 1) {
    return ONE[unit];
  }
  return moment.duration(value, unit).humanize();
};

export const scheduleSummary = (schedule: SnoozeSchedule) => {
  if (schedule.rRule.freq == null) return moment(schedule.rRule.dtstart).format('LLLL');
  const summary = recurrenceSummary(schedule.rRule as RecurrenceSchedule);
  // Capitalize first letter of summary
  return summary[0].toLocaleUpperCase() + summary.slice(1);
};
