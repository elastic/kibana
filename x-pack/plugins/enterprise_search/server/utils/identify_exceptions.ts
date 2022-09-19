/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface ElasticsearchResponseError {
  meta?: {
    body?: {
      error?: {
        type: string;
      };
    };
    statusCode?: number;
  };
  name: 'ResponseError';
}

export const isIndexNotFoundException = (error: ElasticsearchResponseError) =>
  error?.meta?.body?.error?.type === 'index_not_found_exception';

export const isResourceAlreadyExistsException = (error: ElasticsearchResponseError) =>
  error?.meta?.body?.error?.type === 'resource_already_exists_exception';

export const isResourceNotFoundException = (error: ElasticsearchResponseError) =>
  error?.meta?.body?.error?.type === 'resource_not_found_exception';

export const isUnauthorizedException = (error: ElasticsearchResponseError) =>
  error.meta?.statusCode === 403;
