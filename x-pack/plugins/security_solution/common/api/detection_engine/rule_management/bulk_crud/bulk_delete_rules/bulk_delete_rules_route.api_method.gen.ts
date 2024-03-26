/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { HttpFetchOptions } from '@kbn/core-http-browser';
import type {
  BulkDeleteRulesRequestBody,
  BulkDeleteRulesResponse,
} from './bulk_delete_rules_route.gen';

interface HttpClient {
  fetch<T>(url: string, options: HttpFetchOptions): Promise<T>;
}

export const bulkDeleteRules = async <TClient extends HttpClient>(
  client: TClient,
  params: BulkDeleteRulesRequestBody,
  signal?: AbortSignal
) => {
  return client.fetch<BulkDeleteRulesResponse>('/api/detection_engine/rules/_bulk_delete', {
    method: 'delete',
    version: '2023-10-31',
    body: JSON.stringify(params),
    signal,
  });
};
