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
  clusterUuidRT,
  createLiteralValueFromUndefinedRT,
  timeRangeRT,
} from '../shared';

export const postClusterSetupStatusRequestParamsRT = rt.partial({
  clusterUuid: clusterUuidRT,
});

export const postClusterSetupStatusRequestQueryRT = rt.partial({
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

export const postClusterSetupStatusRequestPayloadRT = rt.partial({
  ccs: ccsRT,
  timeRange: timeRangeRT,
});

export type PostClusterSetupStatusRequestPayload = rt.TypeOf<
  typeof postClusterSetupStatusRequestPayloadRT
>;

export const postClusterSetupStatusResponsePayloadRT = rt.type({
  // TODO: add payload entries
});
