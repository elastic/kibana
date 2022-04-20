/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';

export const postApmInstanceRequestParamsRT = rt.type({
  clusterUuid: rt.string,
  apmUuid: rt.string,
});

export const postApmInstanceRequestPayloadRT = rt.intersection([
  rt.partial({
    ccs: rt.string,
  }),
  rt.type({
    timeRange: rt.type({
      min: rt.string,
      max: rt.string,
    }),
  }),
]);

export type PostApmInstanceRequestPayload = rt.TypeOf<typeof postApmInstanceRequestPayloadRT>;

export const postApmInstanceResponsePayloadRT = rt.type({
  data: rt.string,
});
