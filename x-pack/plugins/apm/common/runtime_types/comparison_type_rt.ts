/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';

export enum TimeRangeComparisonEnum {
  WeekBefore = 'week',
  DayBefore = 'day',
  PeriodBefore = 'period',
}

export const comparisonTypeRt = t.union([
  t.literal('day'),
  t.literal('week'),
  t.literal('period'),
]);

export type TimeRangeComparisonType = t.TypeOf<typeof comparisonTypeRt>;
