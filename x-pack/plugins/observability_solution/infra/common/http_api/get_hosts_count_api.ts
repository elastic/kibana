/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dateRt } from '@kbn/io-ts-utils';
import * as rt from 'io-ts';

export const GetInfraHostsCountRequestBodyPayloadRT = rt.intersection([
  rt.partial({
    query: rt.UnknownRecord,
  }),
  rt.type({
    type: rt.literal('host'),
    sourceId: rt.string,
    from: dateRt,
    to: dateRt,
  }),
]);

export const GetInfraHostsCountResponsePayloadRT = rt.type({
  type: rt.literal('host'),
  count: rt.number,
});

export type InfraAssetMetricType = rt.TypeOf<typeof InfraMetricTypeRT>;

export type GetInfraHostsCountRequestBodyPayload = rt.TypeOf<
  typeof GetInfraHostsCountRequestBodyPayloadRT
>;
export type GetInfraHostsCountResponsePayload = rt.TypeOf<
  typeof GetInfraHostsCountResponsePayloadRT
>;
