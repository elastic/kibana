/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, KibanaResponseFactory } from '@kbn/core/server';

/**
 * Logs an unexpected route error and returns an appropriate HTTP error response.
 *
 * Errors that carry a `statusCode` property (e.g. Elasticsearch client errors)
 * have that status forwarded to the caller. All other errors produce a 500.
 * The raw error detail is intentionally not included in the response body to
 * avoid leaking internal information to clients.
 *
 * @param error - The caught error value (may be any type).
 * @param logger - Logger used to record the full error detail server-side.
 * @param response - Kibana response factory from the route handler context.
 * @param message - Human-readable description of the operation that failed,
 *   included in both the log entry and the response body.
 */
export function handleRouteError({
  error,
  logger,
  response,
  message,
}: {
  error: unknown;
  logger: Logger;
  response: KibanaResponseFactory;
  message: string;
}) {
  logger.error(`${message}: ${error instanceof Error ? error.message : String(error)}`);

  const statusCode =
    error instanceof Error && 'statusCode' in error
      ? (error as { statusCode: number }).statusCode
      : 500;

  return response.customError({
    statusCode,
    body: { message },
  });
}
