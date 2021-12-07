/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DateTime } from 'luxon';

export const timeObjFromCalendarObj = (yearMonthDayHour, timeZone) =>
  DateTime.fromObject({ ...yearMonthDayHour, zone: timeZone });
export const timeObjFromEpochSeconds = (timeZone, seconds) =>
  DateTime.fromSeconds(seconds, { zone: timeZone });
export const timeObjToSeconds = (t) => t.toSeconds();
export const timeObjToWeekday = (t) => t.weekday;
export const timeObjToYear = (t) => t.year;
export const addTimeToObj = (obj, unit, count) => obj.plus({ [unit]: count });
