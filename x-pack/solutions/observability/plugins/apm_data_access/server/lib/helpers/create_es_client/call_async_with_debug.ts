/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { RequestStatus } from '@kbn/inspector-plugin/common';
import type { WrappedElasticsearchClientError } from '@kbn/observability-plugin/server';
import { getInspectResponse } from '@kbn/observability-shared-plugin/common';
import type { InspectResponse } from '@kbn/observability-plugin/typings/common';

export async function callAsyncWithDebug<T>({
  cb,
  debug,
  request,
  requestParams,
  operationName,
  isCalledWithInternalUser,
  inspectableEsQueriesMap = new WeakMap<KibanaRequest, InspectResponse>(),
}: {
  cb: () => Promise<T>;
  debug: boolean;
  request?: KibanaRequest;
  requestParams: Record<string, any>;
  operationName: string;
  isCalledWithInternalUser: boolean; // only allow inspection of queries that were retrieved with credentials of the end user
  inspectableEsQueriesMap?: WeakMap<KibanaRequest, InspectResponse>;
}): Promise<T> {
  if (!debug) {
    return cb();
  }

  let res: any;
  let esError: WrappedElasticsearchClientError | null = null;
  let esRequestStatus: RequestStatus = RequestStatus.PENDING;
  const startTimeNow = Date.now();

  try {
    res = await cb();
    esRequestStatus = RequestStatus.OK;
  } catch (e) {
    // catch error and throw after outputting debug info
    esError = e;
    esRequestStatus = RequestStatus.ERROR;
  }

  if (request) {
    const inspectableEsQueries = inspectableEsQueriesMap.get(request);
    if (!isCalledWithInternalUser && inspectableEsQueries) {
      inspectableEsQueries.push(
        getInspectResponse({
          esError,
          esRequestParams: requestParams,
          esRequestStatus,
          esResponse: res,
          kibanaRequest: request,
          operationName,
          startTime: startTimeNow,
        })
      );
    }
  }

  if (esError) {
    throw esError;
  }

  return res;
}
