/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

export const PrivateLocationType = t.intersection([
  t.interface({
    name: t.string,
    id: t.string,
    policyHostId: t.string,
    concurrentMonitors: t.number,
  }),
  t.partial({ geo: t.interface({ lat: t.number, lon: t.number }) }),
]);

export const SyntheticsPrivateLocationsType = t.type({
  locations: t.array(PrivateLocationType),
});
export type PrivateLocation = t.TypeOf<typeof PrivateLocationType>;
export type SyntheticsPrivateLocations = t.TypeOf<typeof SyntheticsPrivateLocationsType>;
