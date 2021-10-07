/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import Boom from '@hapi/boom';

import type { CustomHttpResponseOptions, ResponseError } from 'src/core/server';

export function wrapError(error: any) {
  return Boom.boomify(error, { statusCode: getErrorStatusCode(error) });
}

/**
 * Wraps error into error suitable for Core's custom error response.
 * @param error Any error instance.
 */
export function wrapIntoCustomErrorResponse(error: any) {
  const wrappedError = wrapError(error);
  return {
    body: wrappedError,
    headers: wrappedError.output.headers,
    statusCode: wrappedError.output.statusCode,
  } as CustomHttpResponseOptions<ResponseError>;
}

/**
 * Extracts error code from Boom and Elasticsearch "native" errors.
 * @param error Error instance to extract status code from.
 */
export function getErrorStatusCode(error: any): number {
  if (error instanceof errors.ResponseError) {
    return error.statusCode!;
  }

  return Boom.isBoom(error) ? error.output.statusCode : error.statusCode || error.status;
}

/**
 * Extracts detailed error message from Boom and Elasticsearch "native" errors. It's supposed to be
 * only logged on the server side and never returned to the client as it may contain sensitive
 * information.
 * @param error Error instance to extract message from.
 */
export function getDetailedErrorMessage(error: any): string {
  if (error instanceof errors.ResponseError) {
    return JSON.stringify(error.body);
  }

  if (Boom.isBoom(error)) {
    return JSON.stringify(error.output.payload);
  }

  return error.message;
}
