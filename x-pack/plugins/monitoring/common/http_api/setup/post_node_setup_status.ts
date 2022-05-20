/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import {
  booleanFromStringRT,
  ccsRT,
  createLiteralValueFromUndefinedRT,
  timeRangeRT,
} from '../shared';

export const postNodeSetupStatusRequestParamsRT = rt.type({
  nodeUuid: rt.string,
});

export const postNodeSetupStatusRequestQueryRT = rt.partial({
  // This flag is not intended to be used in production. It was introduced
  // as a way to ensure consistent API testing - the typical data source
  // for API tests are archived data, where the cluster configuration and data
  // are consistent from environment to environment. However, this endpoint
  // also attempts to retrieve data from the running stack products (ES and Kibana)
  // which will vary from environment to environment making it difficult
  // to write tests against. Therefore, this flag exists and should only be used
  // in our testing environment.
  skipLiveData: rt.union([booleanFromStringRT, createLiteralValueFromUndefinedRT(false)]),
});

export const postNodeSetupStatusRequestPayloadRT = rt.partial({
  ccs: ccsRT,
  timeRange: timeRangeRT,
});

export type PostNodeSetupStatusRequestPayload = rt.TypeOf<
  typeof postNodeSetupStatusRequestPayloadRT
>;

export const postNodeSetupStatusResponsePayloadRT = rt.type({
  // TODO: add payload entries
});
