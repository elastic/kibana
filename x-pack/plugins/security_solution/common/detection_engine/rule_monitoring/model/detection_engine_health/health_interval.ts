/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { IsoDateString } from '@kbn/securitysolution-io-ts-types';

export enum HealthIntervalType {
  'last_hour' = 'last_hour',
  'last_day' = 'last_day',
  'last_week' = 'last_week',
  'last_month' = 'last_month',
  'last_year' = 'last_year',
  'custom_range' = 'custom_range',
}

export enum HealthIntervalGranularity {
  'minute' = 'minute',
  'hour' = 'hour',
  'day' = 'day',
  'week' = 'week',
  'month' = 'month',
}

export type HealthIntervalParameters = t.TypeOf<typeof HealthIntervalParameters>;
export const HealthIntervalParameters = t.union([
  t.exact(
    t.type({
      type: t.literal(HealthIntervalType.last_hour),
      granularity: t.literal(HealthIntervalGranularity.minute),
    })
  ),
  t.exact(
    t.type({
      type: t.literal(HealthIntervalType.last_day),
      granularity: t.union([
        t.literal(HealthIntervalGranularity.minute),
        t.literal(HealthIntervalGranularity.hour),
      ]),
    })
  ),
  t.exact(
    t.type({
      type: t.literal(HealthIntervalType.last_week),
      granularity: t.union([
        t.literal(HealthIntervalGranularity.hour),
        t.literal(HealthIntervalGranularity.day),
      ]),
    })
  ),
  t.exact(
    t.type({
      type: t.literal(HealthIntervalType.last_month),
      granularity: t.union([
        t.literal(HealthIntervalGranularity.day),
        t.literal(HealthIntervalGranularity.week),
      ]),
    })
  ),
  t.exact(
    t.type({
      type: t.literal(HealthIntervalType.last_year),
      granularity: t.union([
        t.literal(HealthIntervalGranularity.week),
        t.literal(HealthIntervalGranularity.month),
      ]),
    })
  ),
  t.exact(
    t.type({
      type: t.literal(HealthIntervalType.custom_range),
      granularity: t.union([
        t.literal(HealthIntervalGranularity.minute),
        t.literal(HealthIntervalGranularity.hour),
        t.literal(HealthIntervalGranularity.day),
        t.literal(HealthIntervalGranularity.week),
        t.literal(HealthIntervalGranularity.month),
      ]),
      from: IsoDateString,
      to: IsoDateString,
    })
  ),
]);

export interface HealthInterval {
  type: HealthIntervalType;
  granularity: HealthIntervalGranularity;
  from: IsoDateString;
  to: IsoDateString;
  duration: string;
}
