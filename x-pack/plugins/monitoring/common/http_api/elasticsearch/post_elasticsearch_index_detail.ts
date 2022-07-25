/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { ccsRT, clusterUuidRT, createLiteralValueFromUndefinedRT, timeRangeRT } from '../shared';

export const postElasticsearchIndexDetailRequestParamsRT = rt.type({
  clusterUuid: clusterUuidRT,
  id: rt.string,
});

export const postElasticsearchIndexDetailRequestPayloadRT = rt.intersection([
  rt.partial({
    ccs: ccsRT,
  }),
  rt.type({
    is_advanced: rt.union([rt.boolean, createLiteralValueFromUndefinedRT(false)]),
    timeRange: timeRangeRT,
  }),
]);

export type PostElasticsearchIndexDetailRequestPayload = rt.TypeOf<
  typeof postElasticsearchIndexDetailRequestPayloadRT
>;

export const postElasticsearchIndexDetailResponsePayloadRT = rt.type({
  // TODO: add payload entries
});
