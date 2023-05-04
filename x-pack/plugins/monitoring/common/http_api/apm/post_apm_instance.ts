/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { ccsRT, clusterUuidRT, timeRangeRT } from '../shared';

export const postApmInstanceRequestParamsRT = rt.type({
  clusterUuid: clusterUuidRT,
  apmUuid: rt.string,
});

export const postApmInstanceRequestPayloadRT = rt.intersection([
  rt.partial({
    ccs: ccsRT,
  }),
  rt.type({
    timeRange: timeRangeRT,
  }),
]);

export type PostApmInstanceRequestPayload = rt.TypeOf<typeof postApmInstanceRequestPayloadRT>;

export const postApmInstanceResponsePayloadRT = rt.type({
  // TODO: add payload entries
});
