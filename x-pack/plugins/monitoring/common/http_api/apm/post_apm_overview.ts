/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';

export const postApmOverviewRequestParamsRT = rt.type({
  clusterUuid: rt.string,
});

export const postApmOverviewRequestPayloadRT = rt.intersection([
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

export type PostApmOverviewRequestPayload = rt.TypeOf<typeof postApmOverviewRequestPayloadRT>;

export const postApmOverviewResponsePayloadRT = rt.type({
  data: rt.string,
});
