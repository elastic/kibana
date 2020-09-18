/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as t from 'io-ts';
import { CheckGeoType, SummaryType } from '../common';

// IO type for validation
export const MonitorLocationType = t.type({
  up_history: t.number,
  down_history: t.number,
  timestamp: t.string,
  summary: SummaryType,
  geo: CheckGeoType,
});

// Typescript type for type checking
export type MonitorLocation = t.TypeOf<typeof MonitorLocationType>;

export const MonitorLocationsType = t.intersection([
  t.type({
    monitorId: t.string,
    up_history: t.number,
    down_history: t.number,
  }),
  t.partial({ locations: t.array(MonitorLocationType) }),
]);
export type MonitorLocations = t.TypeOf<typeof MonitorLocationsType>;
