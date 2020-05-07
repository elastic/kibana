/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';

export const MonitorDurationAveragePointType = t.intersection([
  t.type({
    x: t.number,
  }),
  t.partial({
    y: t.union([t.number, t.null]),
  }),
]);

export type MonitorDurationAveragePoint = t.TypeOf<typeof MonitorDurationAveragePointType>;

export const LocationDurationLineType = t.type({
  name: t.string,
  line: t.array(MonitorDurationAveragePointType),
});

export type LocationDurationLine = t.TypeOf<typeof LocationDurationLineType>;

export const MonitorDurationResultType = t.type({
  locationDurationLines: t.array(LocationDurationLineType),
});

export type MonitorDurationResult = t.TypeOf<typeof MonitorDurationResultType>;
