/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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

export const ServiceLocationsCodec = t.array(ServiceLocationCodec);

export const ServiceLocationsApiResponseCodec = t.interface({
  locations: ServiceLocationsCodec,
});

export type ManifestLocation = t.TypeOf<typeof ManifestLocationCodec>;
export type ServiceLocation = t.TypeOf<typeof ServiceLocationCodec>;
export type ServiceLocations = t.TypeOf<typeof ServiceLocationsCodec>;
export type ServiceLocationsApiResponse = t.TypeOf<typeof ServiceLocationsApiResponseCodec>;
