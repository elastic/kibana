/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';

export const StatusCheckFiltersType = t.type({
  'monitor.type': t.array(t.string),
  'observer.geo.name': t.array(t.string),
  tags: t.array(t.string),
  'url.port': t.array(t.string),
});

export type StatusCheckFilters = t.TypeOf<typeof StatusCheckFiltersType>;

export const AtomicStatusCheckParamsType = t.intersection([
  t.type({
    numTimes: t.number,
    timerangeCount: t.number,
    timerangeUnit: t.string,
  }),
  t.partial({
    search: t.string,
    filters: StatusCheckFiltersType,
    shouldCheckStatus: t.boolean,
  }),
]);

export type AtomicStatusCheckParams = t.TypeOf<typeof AtomicStatusCheckParamsType>;

export const StatusCheckParamsType = t.intersection([
  t.partial({
    filters: t.string,
    shouldCheckStatus: t.boolean,
  }),
  t.type({
    locations: t.array(t.string),
    numTimes: t.number,
    timerange: t.type({
      from: t.string,
      to: t.string,
    }),
  }),
]);

export const RangeUnitType = t.union([
  t.literal('s', 'Second'),
  t.literal('m', 'Minute'),
  t.literal('h', 'Hour'),
  t.literal('d', 'Day'),
  t.literal('w', 'Week'),
  t.literal('M', 'Month'),
  t.literal('y', 'Year'),
]);

export type RangeUnit = t.TypeOf<typeof RangeUnitType>;

export type StatusCheckParams = t.TypeOf<typeof StatusCheckParamsType>;

export const GetMonitorAvailabilityParamsType = t.intersection([
  t.type({
    range: t.number,
    rangeUnit: RangeUnitType,
    threshold: t.string,
  }),
  t.partial({
    filters: t.string,
  }),
]);

export type GetMonitorAvailabilityParams = t.TypeOf<typeof GetMonitorAvailabilityParamsType>;

export const MonitorAvailabilityType = t.intersection([
  t.type({
    availability: GetMonitorAvailabilityParamsType,
    shouldCheckAvailability: t.boolean,
  }),
  t.partial({
    filters: StatusCheckFiltersType,
    search: t.string,
  }),
]);

export type MonitorAvailability = t.Type<typeof MonitorAvailabilityType>;
