/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isLeft } from 'fp-ts/lib/Either';
import * as t from 'io-ts';
import { tEnum } from '../../utils/t_enum';

export enum BandwidthLimitKey {
  DOWNLOAD = 'download',
  UPLOAD = 'upload',
  LATENCY = 'latency',
}

export const DEFAULT_BANDWIDTH_LIMIT = {
  [BandwidthLimitKey.DOWNLOAD]: 100,
  [BandwidthLimitKey.UPLOAD]: 30,
  [BandwidthLimitKey.LATENCY]: 1000,
};

export const DEFAULT_THROTTLING = {
  [BandwidthLimitKey.DOWNLOAD]: DEFAULT_BANDWIDTH_LIMIT[BandwidthLimitKey.DOWNLOAD],
  [BandwidthLimitKey.UPLOAD]: DEFAULT_BANDWIDTH_LIMIT[BandwidthLimitKey.UPLOAD],
  [BandwidthLimitKey.LATENCY]: DEFAULT_BANDWIDTH_LIMIT[BandwidthLimitKey.LATENCY],
};

export const BandwidthLimitKeyCodec = tEnum<BandwidthLimitKey>(
  'BandwidthLimitKey',
  BandwidthLimitKey
);

export type BandwidthLimitKeyType = t.TypeOf<typeof BandwidthLimitKeyCodec>;

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
        failed_monitors: t.union([
          t.array(
            t.interface({
              id: t.string,
              message: t.string,
            })
          ),
          t.null,
        ]),
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

export const ThrottlingOptionsCodec = t.interface({
  [BandwidthLimitKey.DOWNLOAD]: t.number,
  [BandwidthLimitKey.UPLOAD]: t.number,
  [BandwidthLimitKey.LATENCY]: t.number,
});

export const ServiceLocationsApiResponseCodec = t.interface({
  throttling: t.union([ThrottlingOptionsCodec, t.undefined]),
  locations: ServiceLocationsCodec,
});

export type ManifestLocation = t.TypeOf<typeof ManifestLocationCodec>;
export type ServiceLocation = t.TypeOf<typeof ServiceLocationCodec>;
export type ServiceLocations = t.TypeOf<typeof ServiceLocationsCodec>;
export type ServiceLocationsApiResponse = t.TypeOf<typeof ServiceLocationsApiResponseCodec>;
export type ServiceLocationErrors = t.TypeOf<typeof ServiceLocationErrors>;
export type ThrottlingOptions = t.TypeOf<typeof ThrottlingOptionsCodec>;
export type Locations = t.TypeOf<typeof LocationsCodec>;
