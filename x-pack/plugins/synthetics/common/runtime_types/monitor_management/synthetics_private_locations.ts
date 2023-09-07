/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

export const PrivateLocationCodec = t.intersection([
  t.interface({
    label: t.string,
    id: t.string,
    agentPolicyId: t.string,
    concurrentMonitors: t.number,
  }),
  t.partial({
    isServiceManaged: t.boolean,
    isInvalid: t.boolean,
    tags: t.array(t.string),
    geo: t.interface({
      lat: t.number,
      lon: t.number,
    }),
  }),
]);

export const SyntheticsPrivateLocationsType = t.type({
  locations: t.array(PrivateLocationCodec),
});
export type PrivateLocation = t.TypeOf<typeof PrivateLocationCodec>;
export type SyntheticsPrivateLocations = t.TypeOf<typeof SyntheticsPrivateLocationsType>;
