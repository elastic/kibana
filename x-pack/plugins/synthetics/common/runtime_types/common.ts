/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

export const LocationType = t.type({
  lat: t.string,
  lon: t.string,
});

export const CheckGeoType = t.intersection([
  t.type({
    name: t.string,
  }),
  t.partial({
    location: LocationType,
  }),
]);

export const SummaryType = t.partial({
  up: t.number,
  down: t.number,
  geo: CheckGeoType,
});

export const StatesIndexStatusType = t.type({
  indexExists: t.boolean,
  docCount: t.number,
  indices: t.string,
});

export const DateRangeType = t.type({
  from: t.string,
  to: t.string,
});

export type Summary = t.TypeOf<typeof SummaryType>;
export type Location = t.TypeOf<typeof LocationType>;
export type GeoPoint = t.TypeOf<typeof CheckGeoType>;
export type StatesIndexStatus = t.TypeOf<typeof StatesIndexStatusType>;
export type DateRange = t.TypeOf<typeof DateRangeType>;
