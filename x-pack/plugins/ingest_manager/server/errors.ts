/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable max-classes-per-file */
import Boom from 'boom';
import { RequestHandlerContext, KibanaRequest, KibanaResponseFactory } from 'src/core/server';
import { appContextService } from './services';

export class IngestManagerError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = this.constructor.name; // for stack traces
  }
}

export const getHTTPResponseCode = (error: IngestManagerError): number => {
  if (error instanceof RegistryError) {
    return 502; // Bad Gateway
  }
  if (error instanceof PackageNotFoundError) {
    return 404; // Not Found
  }

  return 400; // Bad Request
};

interface IngestErrorHandler {
  error: IngestManagerError | Boom | Error;
  response: KibanaResponseFactory;
  request?: KibanaRequest;
  context?: RequestHandlerContext;
}

export const defaultIngestErrorHandler = async ({
  error,
  request,
  response,
  context,
}: IngestErrorHandler) => {
  const logger = appContextService.getLogger();
  if (error instanceof IngestManagerError) {
    logger.error(error.message);
    return response.customError({
      statusCode: getHTTPResponseCode(error),
      body: { message: error.message },
    });
  }
  if ('isBoom' in error) {
    logger.error(error.output.payload.message);
    return response.customError({
      statusCode: error.output.statusCode,
      body: { message: error.output.payload.message },
    });
  }
  logger.error(error);
  return response.customError({
    statusCode: 500,
    body: { message: error.message },
  });
};

export class RegistryError extends IngestManagerError {}
export class RegistryConnectionError extends RegistryError {}
export class RegistryResponseError extends RegistryError {}
export class PackageNotFoundError extends IngestManagerError {}
export class PackageOutdatedError extends IngestManagerError {}
