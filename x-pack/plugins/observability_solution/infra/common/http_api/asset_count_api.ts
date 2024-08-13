/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dateRt } from '@kbn/io-ts-utils';
import * as rt from 'io-ts';

const AssetTypeRT = rt.type({
  assetType: rt.literal('host'),
});

export const GetInfraAssetCountRequestBodyPayloadRT = rt.intersection([
  rt.partial({
    query: rt.UnknownRecord,
  }),
  rt.type({
    sourceId: rt.string,
    from: dateRt,
    to: dateRt,
  }),
]);

export const GetInfraAssetCountRequestParamsPayloadRT = AssetTypeRT;

export const GetInfraAssetCountResponsePayloadRT = rt.intersection([
  AssetTypeRT,
  rt.type({
    count: rt.number,
  }),
]);

export type GetInfraAssetCountRequestParamsPayload = rt.TypeOf<
  typeof GetInfraAssetCountRequestParamsPayloadRT
>;
export type GetInfraAssetCountRequestBodyPayload = Omit<
  rt.TypeOf<typeof GetInfraAssetCountRequestBodyPayloadRT>,
  'from' | 'to'
> & {
  from: string;
  to: string;
};

export type GetInfraAssetCountResponsePayload = rt.TypeOf<
  typeof GetInfraAssetCountResponsePayloadRT
>;
