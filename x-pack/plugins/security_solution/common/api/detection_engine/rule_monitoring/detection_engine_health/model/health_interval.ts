/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { IsoDateString } from '@kbn/securitysolution-io-ts-types';

/**
 * Type of the health interval. You can specify:
 * - a relative interval, e.g. "last_hour" = [now-1h; now] where "now" is when health request is made
 * - a custom interval with "from" and "to" timestamps
 */
export enum HealthIntervalType {
  'last_hour' = 'last_hour',
  'last_day' = 'last_day',
  'last_week' = 'last_week',
  'last_month' = 'last_month',
  'last_year' = 'last_year',
  'custom_range' = 'custom_range',
}

/**
 * Granularity defines how the whole health interval will be split into smaller sub-intervals.
 * Health stats will be calculated for the whole interval + for each sub-interval.
 * Example: if the interval is "last_day" and the granularity is "hour", stats will be calculated:
 * - 1 time for the last 24 hours
 * - 24 times for each hour in that interval
 */
export enum HealthIntervalGranularity {
  'minute' = 'minute',
  'hour' = 'hour',
  'day' = 'day',
  'week' = 'week',
  'month' = 'month',
}

/**
 * Time period over which we calculate health stats.
 * This is a "raw" schema for the interval parameters that users can pass to the API.
 */
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

/**
 * Time period over which we calculate health stats.
 * This interface represents a fully validated and normalized interval object.
 */
export interface HealthInterval {
  /**
   * Type of the interval. Defined by the user.
   * @example 'last_week'
   */
  type: HealthIntervalType;

  /**
   * Granularity of the interval. Defined by the user.
   * @example 'day'
   */
  granularity: HealthIntervalGranularity;

  /**
   * Start timestamp of the interval. Calculated by the app.
   * @example '2023-05-19T14:25:19.092Z'
   */
  from: IsoDateString;

  /**
   * End timestamp of the interval. Calculated by the app.
   * @example '2023-05-26T14:25:19.092Z'
   */
  to: IsoDateString;

  /**
   * Duration of the interval in the ISO format. Calculated by the app.
   * @example 'PT168H'
   */
  duration: string;
}
