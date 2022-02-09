/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isLeft } from 'fp-ts/lib/Either';
import * as t from 'io-ts';

const LocationGeoCodec = t.interface({
  lat: t.number,
  lon: t.number,
});

export const ManifestLocationCodec = t.interface({
  url: t.string,
  geo: t.interface({
    name: t.string,
    location: LocationGeoCodec,
  }),
  status: t.string,
});

export const ServiceLocationCodec = t.interface({
  id: t.string,
  label: t.string,
  geo: LocationGeoCodec,
  url: t.string,
});

export const ServiceLocationErrors = t.array(
  t.interface({
    locationId: t.string,
    error: t.intersection([
      t.interface({
        reason: t.string,
        status: t.number,
      }),
      t.partial({
        failed_monitors: t.array(
          t.interface({
            id: t.string,
            message: t.string,
          })
        ),
      }),
    ]),
  })
);

export const ServiceLocationsCodec = t.array(ServiceLocationCodec);

export const LocationCodec = t.intersection([
  ServiceLocationCodec,
  t.partial({ isServiceManaged: t.boolean }),
]);

export const LocationsCodec = t.array(LocationCodec);

export const isServiceLocationInvalid = (location: ServiceLocation) =>
  isLeft(ServiceLocationCodec.decode(location));

export const ServiceLocationsApiResponseCodec = t.interface({
  locations: ServiceLocationsCodec,
});

export type ManifestLocation = t.TypeOf<typeof ManifestLocationCodec>;
export type ServiceLocation = t.TypeOf<typeof ServiceLocationCodec>;
export type ServiceLocations = t.TypeOf<typeof ServiceLocationsCodec>;
export type ServiceLocationsApiResponse = t.TypeOf<typeof ServiceLocationsApiResponseCodec>;
export type ServiceLocationErrors = t.TypeOf<typeof ServiceLocationErrors>;
export type Locations = t.TypeOf<typeof LocationsCodec>;
