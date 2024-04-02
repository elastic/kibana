/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaResponseFactory } from '@kbn/core-http-server';

import { ErrorCode } from '../types';

export interface SearchPlaygroundError {
  errorCode: ErrorCode;
  message: string;
  statusCode: number;
}

export function createError({
  errorCode,
  message,
  response,
  statusCode,
}: SearchPlaygroundError & {
  response: KibanaResponseFactory;
}) {
  return response.customError({
    body: {
      attributes: {
        error_code: errorCode,
      },
      message,
    },
    statusCode,
  });
}
