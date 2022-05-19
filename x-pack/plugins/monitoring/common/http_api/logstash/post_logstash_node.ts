/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { clusterUuidRT, ccsRT, timeRangeRT } from '../shared';

export const postLogstashNodeRequestParamsRT = rt.type({
  clusterUuid: clusterUuidRT,
  logstashUuid: rt.string,
});

export const postLogstashNodeRequestPayloadRT = rt.intersection([
  rt.partial({
    ccs: ccsRT,
  }),
  rt.type({
    timeRange: timeRangeRT,
    is_advanced: rt.boolean,
  }),
]);
