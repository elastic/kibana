/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { addTime, propsFromCalendarObj } from './chrono.js';

const timeProps = ['epochSeconds', 'dayOfWeek'];
export const timeProp = Object.fromEntries(timeProps.map((propName, i) => [propName, i]));

const zonedDateTimeFromCache = {}; // without caching, even luxon is choppy with zoom and pan
export const cachedZonedDateTimeFrom = (temporalArgs) => {
  const { timeZone, year, month, day, hour = 0, minute = 0, second = 0 } = temporalArgs;
  const key = `_${year}_${month}_${day}_${hour}_${minute}_${second}`;
  const cachedValue = zonedDateTimeFromCache[key];
  if (cachedValue) {
    return cachedValue;
  }
  const result = propsFromCalendarObj({ year, month, day, hour }, timeZone);
  zonedDateTimeFromCache[key] = result;
  return result;
};

const deltaTimeCache = {}; // without caching, even luxon is choppy with zoom and pan
export const cachedTimeDelta = (temporalArgs, unit, count) => {
  const { timeZone, year, month, day, hour = 0, minute = 0, second = 0 } = temporalArgs;
  const key = `_${year}_${month}_${day}_${hour}_${minute}_${second}_${count}_${unit}`;
  const cachedValue = deltaTimeCache[key];
  if (cachedValue) {
    return cachedValue;
  }
  const result = addTime({ year, month, day }, timeZone, unit, count);
  deltaTimeCache[key] = result;
  return result;
};
