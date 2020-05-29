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
  }),
]);

export type AtomicStatusCheckParams = t.TypeOf<typeof AtomicStatusCheckParamsType>;

export const StatusCheckParamsType = t.intersection([
  t.partial({
    filters: t.string,
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

export type StatusCheckParams = t.TypeOf<typeof StatusCheckParamsType>;
