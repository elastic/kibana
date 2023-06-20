/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

export const PrivateLocationConfigCodec = t.intersection([
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
    /* Empty Lat lon was accidentally saved as an empty string instead of undefined or null
     * Need a migration to fix */
    geo: t.interface({ lat: t.union([t.string, t.number]), lon: t.union([t.string, t.number]) }),
  }),
]);

export const SyntheticsPrivateLocationsAttributesCodec = t.type({
  locations: t.array(PrivateLocationConfigCodec),
});
export type PrivateLocationConfiguration = t.TypeOf<typeof PrivateLocationConfigCodec>;
export type SyntheticsPrivateLocationsAttributes = t.TypeOf<
  typeof SyntheticsPrivateLocationsAttributesCodec
>;
