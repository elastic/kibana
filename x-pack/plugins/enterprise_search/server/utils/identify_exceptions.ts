/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface ErrorResponse {
  meta?: {
    body?: {
      error?: {
        type: string;
      };
    };
  };
  name: 'ResponseError';
  statusCode: string;
}

export const isIndexNotFoundException = (error: ErrorResponse) =>
  error?.meta?.body?.error?.type === 'index_not_found_exception';

export const isResourceAlreadyExistsException = (error: ErrorResponse) =>
  error?.meta?.body?.error?.type === 'resource_already_exists_exception';
