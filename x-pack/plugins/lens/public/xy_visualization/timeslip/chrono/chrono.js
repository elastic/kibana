/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  addTimeToObj,
  timeObjFromCalendarObj,
  timeObjFromEpochSeconds,
  timeObjToSeconds,
  timeObjToWeekday,
  timeObjToYear,
} from './chrono-luxon/chrono-luxon.js';
//from './chrono-moment/chrono-moment.js'
//from './chrono-proposal-temporal/chrono-proposal-temporal.js'

// library independent part
export const propsFromCalendarObj = (calendarObj, timeZone) => {
  const t = timeObjFromCalendarObj(calendarObj, timeZone);
  return [timeObjToSeconds(t), timeObjToWeekday(t)];
};
export const epochInSecondsToYear = (timeZone, seconds) =>
  timeObjToYear(timeObjFromEpochSeconds(timeZone, seconds));
export const addTime = (calendarObj, timeZone, unit, count) =>
  timeObjToSeconds(addTimeToObj(timeObjFromCalendarObj(calendarObj, timeZone), unit, count));
