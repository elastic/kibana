/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, KibanaResponseFactory } from '@kbn/core/server';

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
