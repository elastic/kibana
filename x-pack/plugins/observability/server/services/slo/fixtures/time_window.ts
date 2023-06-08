/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RollingTimeWindow, TimeWindow } from '../../../domain/models/time_window';
import { oneWeek, sevenDays, sixHours, thirtyDays } from './duration';

export function sixHoursRolling(): TimeWindow {
  return {
    duration: sixHours(),
    type: 'rolling',
  };
}

export function sevenDaysRolling(): RollingTimeWindow {
  return {
    duration: sevenDays(),
    type: 'rolling',
  };
}
export function thirtyDaysRolling(): RollingTimeWindow {
  return {
    duration: thirtyDays(),
    type: 'rolling',
  };
}

export function weeklyCalendarAligned(): TimeWindow {
  return {
    duration: oneWeek(),
    type: 'calendarAligned',
  };
}
