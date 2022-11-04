/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TimeWindow } from '../../../types/models/time_window';
import { oneWeek, sevenDays } from './duration';

export function sevenDaysRolling(): TimeWindow {
  return {
    duration: sevenDays(),
    is_rolling: true,
  };
}

export function weeklyCalendarAligned(startTime: Date): TimeWindow {
  return {
    duration: oneWeek(),
    calendar: {
      start_time: startTime,
    },
  };
}
