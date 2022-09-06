/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { clusterUuidRT, ccsRT } from '../shared';

export const postLogstashPipelineRequestParamsRT = rt.type({
  clusterUuid: clusterUuidRT,
  pipelineId: rt.string,
  pipelineHash: rt.union([rt.string, rt.undefined]),
});

export const postLogstashPipelineRequestPayloadRT = rt.intersection([
  rt.partial({
    ccs: ccsRT,
  }),
  rt.partial({
    detailVertexId: rt.string,
  }),
]);
