/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RequestStatus } from '@kbn/inspector-plugin/common';
import type { Adapters } from '@kbn/inspector-plugin/public';
import { estypes } from '@elastic/elasticsearch';

export interface ILensRequestPerformance {
  requestTimeTotal: number;
  esTookTotal: number;
}

export function getSuccessfulRequestTimings(
  inspectorAdapters: Adapters
): ILensRequestPerformance | null {
  const requests = inspectorAdapters.requests?.getRequests() || [];

  let totalTookTime = 0;
  let totalTime = 0;
  for (let i = 0; i < requests.length; i++) {
    const request = requests[i];
    if (request.status !== RequestStatus.OK) {
      return null;
    }
    totalTookTime +=
      (request.response?.json as { rawResponse: estypes.SearchResponse | undefined } | undefined)
        ?.rawResponse?.took ?? 0;
    totalTime += request.time || 0;
  }

  return {
    requestTimeTotal: totalTime,
    esTookTotal: totalTookTime,
  };
}
