/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { HttpFetchOptions } from '@kbn/core-http-browser';
import type { ReadTagsResponse } from './read_tags_route.gen';

interface HttpClient {
  fetch<T>(url: string, options: HttpFetchOptions): Promise<T>;
}

export const readTags = async <TClient extends HttpClient>(
  client: TClient,
  signal?: AbortSignal
) => {
  return client.fetch<ReadTagsResponse>('/api/detection_engine/tags', {
    method: 'get',
    version: '2023-10-31',
    signal,
  });
};
