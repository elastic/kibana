/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createLiteralValueFromUndefinedRT,
  inRangeFromStringRt,
  dateRt,
  datemathStringRt,
} from '@kbn/io-ts-utils';
import * as rt from 'io-ts';

export const serviceAssetRT = rt.type({
  'service.name': rt.string,
  'agent.name': rt.union([rt.string, rt.undefined]),
});

export type ServiceAsset = rt.TypeOf<typeof serviceAssetRT>;

export const sizeRT = rt.union([
  inRangeFromStringRt(1, 100),
  createLiteralValueFromUndefinedRT(10),
]);
export const assetDateRT = rt.union([dateRt, datemathStringRt]);

export type GetServicesRequestQuery = rt.TypeOf<typeof GetServicesRequestQueryRT>;

export const servicesFiltersRT = rt.exact(
  rt.type({
    ['host.name']: rt.string,
  })
);

export type ServicesFilter = rt.TypeOf<typeof servicesFiltersRT>;

export const GetServicesRequestQueryRT = rt.intersection([
  rt.strict({ from: assetDateRT, stringFilters: rt.string }),
  rt.partial({
    to: assetDateRT,
    size: sizeRT,
    filters: servicesFiltersRT,
  }),
]);

export interface GetServicesResponse {
  services: ServiceAsset[];
}
