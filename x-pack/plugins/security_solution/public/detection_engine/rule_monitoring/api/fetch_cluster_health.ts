/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  GetClusterHealthResponse,
  HealthIntervalParameters,
} from '../../../../common/api/detection_engine';
import { GET_CLUSTER_HEALTH_URL } from '../../../../common/api/detection_engine';
import { KibanaServices } from '../../../common/lib/kibana';

interface GetAiRuleMonitoringResultParams {
  interval?: HealthIntervalParameters;
  signal?: AbortSignal;
}

export async function fetchClusterHealth({
  interval,
  signal,
}: GetAiRuleMonitoringResultParams): Promise<GetClusterHealthResponse> {
  return KibanaServices.get().http.fetch<GetClusterHealthResponse>(GET_CLUSTER_HEALTH_URL, {
    method: 'POST',
    version: '1',
    body: JSON.stringify({
      interval,
    }),
    signal,
  });
}
