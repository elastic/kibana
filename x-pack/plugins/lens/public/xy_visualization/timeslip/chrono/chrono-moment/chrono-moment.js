/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
const tz = moment.tz;

export const timeObjFromCalendarObj = ({ year, month, day, hour }, timeZone) =>
  tz({ year, month: month - 1, day, hour }, timeZone);
export const timeObjFromEpochSeconds = (timeZone, seconds) => tz(seconds * 1000, timeZone);
export const timeObjToSeconds = (t) => t.unix();
export const timeObjToWeekday = (t) => t.isoWeekday();
export const timeObjToYear = (t) => t.year();
export const addTimeToObj = (obj, unit, count) => obj.add(count, unit);
