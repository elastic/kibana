/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import type { SavedObjectMigrationFn } from '@kbn/core/server';
import type { SyntheticsPrivateLocationsAttributes } from '../../../../../runtime_types/private_locations';

export const PrivateLocationAttributesCodecLegacy = t.intersection([
  t.interface({
    label: t.string,
    id: t.string,
    agentPolicyId: t.string,
    concurrentMonitors: t.number,
  }),
  t.partial({
    tags: t.array(t.string),
    /* Empty Lat lon was accidentally saved as an empty string instead of undefined or null
     * Need a migration to fix */
    geo: t.interface({ lat: t.union([t.string, t.number]), lon: t.union([t.string, t.number]) }),
  }),
]);
export const SyntheticsPrivateLocationsAttributesCodecLegacy = t.type({
  locations: t.array(PrivateLocationAttributesCodecLegacy),
});
export type SyntheticsPrivateLocationsAttributesLegacy = t.TypeOf<
  typeof SyntheticsPrivateLocationsAttributesCodecLegacy
>;

export const migration8100: SavedObjectMigrationFn<
  SyntheticsPrivateLocationsAttributesLegacy,
  SyntheticsPrivateLocationsAttributes
> = (privateLocationDoc) => {
  const { locations } = privateLocationDoc.attributes;
  return {
    ...privateLocationDoc,
    attributes: {
      locations: locations.map((location) => ({
        ...location,
        geo: {
          lat: location.geo?.lat ? Number(location.geo?.lat) : null,
          lon: location.geo?.lon ? Number(location.geo.lon) : null,
        },
        isServiceManaged: false,
      })),
    },
  };
};
