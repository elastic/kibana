/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { HttpFetchOptions } from '@kbn/core-http-browser';
import type { InstallPrebuiltRulesAndTimelinesResponse } from './install_prebuilt_rules_and_timelines_route.gen';

interface HttpClient {
  fetch<T>(url: string, options: HttpFetchOptions): Promise<T>;
}

export const installPrebuiltRulesAndTimelines = async <TClient extends HttpClient>(
  client: TClient,
  signal?: AbortSignal
) => {
  return client.fetch<InstallPrebuiltRulesAndTimelinesResponse>(
    '/api/detection_engine/rules/prepackaged',
    {
      method: 'put',
      version: '2023-10-31',
      signal,
    }
  );
};
