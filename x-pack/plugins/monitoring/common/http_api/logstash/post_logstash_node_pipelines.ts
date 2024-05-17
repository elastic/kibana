/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { ccsRT, clusterUuidRT, paginationRT, sortingRT, timeRangeRT } from '../shared';

export const postLogstashNodePipelinesRequestParamsRT = rt.type({
  clusterUuid: clusterUuidRT,
  logstashUuid: rt.string,
});

export const postLogstashNodePipelinesRequestPayloadRT = rt.intersection([
  rt.partial({
    ccs: ccsRT,
    sort: sortingRT,
    queryText: rt.string,
  }),
  rt.type({
    timeRange: timeRangeRT,
    pagination: paginationRT,
  }),
]);
