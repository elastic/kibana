/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { HttpFetchOptions } from '@kbn/core-http-browser';
import type {
  PerformBulkActionsRequestQuery,
  PerformBulkActionsRequestBody,
  PerformBulkActionsResponse,
} from './perform_bulk_actions_route.gen';

interface HttpClient {
  fetch<T>(url: string, options: HttpFetchOptions): Promise<T>;
}

export const performBulkActions = async <TClient extends HttpClient>(
  client: TClient,
  params: PerformBulkActionsRequestBody,
  query: PerformBulkActionsRequestQuery,
  signal?: AbortSignal
) => {
  return client.fetch<PerformBulkActionsResponse>('/api/detection_engine/rules/_bulk_action', {
    method: 'post',
    version: '2023-10-31',
    body: JSON.stringify(params),
    query,
    signal,
  });
};
