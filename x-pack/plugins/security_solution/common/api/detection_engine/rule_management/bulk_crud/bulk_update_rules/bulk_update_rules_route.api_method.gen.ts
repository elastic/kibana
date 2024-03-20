/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { HttpFetchOptions } from '@kbn/core-http-browser';
import type {
  BulkUpdateRulesRequestBody,
  BulkUpdateRulesResponse,
} from './bulk_update_rules_route.gen';

interface HttpClient {
  fetch<T>(url: string, options: HttpFetchOptions): Promise<T>;
}

export const bulkUpdateRules = async <TClient extends HttpClient>(
  client: TClient,
  params: BulkUpdateRulesRequestBody,
  signal?: AbortSignal
) => {
  return client.fetch<BulkUpdateRulesResponse>('/api/detection_engine/rules/_bulk_update', {
    method: 'put',
    version: '2023-10-31',
    body: JSON.stringify(params),
    signal,
  });
};
