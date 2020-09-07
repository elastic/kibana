/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable max-classes-per-file */
import Boom, { isBoom } from 'boom';
import {
  RequestHandlerContext,
  KibanaRequest,
  IKibanaResponse,
  KibanaResponseFactory,
} from 'src/core/server';
import { appContextService } from './services';

type IngestErrorHandler = (
  params: IngestErrorHandlerParams
) => IKibanaResponse | Promise<IKibanaResponse>;

interface IngestErrorHandlerParams {
  error: IngestManagerError | Boom | Error;
  response: KibanaResponseFactory;
  request?: KibanaRequest;
  context?: RequestHandlerContext;
}

export class IngestManagerError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = this.constructor.name; // for stack traces
  }
}

const getHTTPResponseCode = (error: IngestManagerError): number => {
  if (error instanceof RegistryError) {
    return 502; // Bad Gateway
  }
  if (error instanceof PackageNotFoundError) {
    return 404; // Not Found
  }

  return 400; // Bad Request
};

export const defaultIngestErrorHandler: IngestErrorHandler = async ({
  error,
  response,
}: IngestErrorHandlerParams): Promise<IKibanaResponse> => {
  const logger = appContextService.getLogger();

  // our "expected" errors
  if (error instanceof IngestManagerError) {
    // only log the message
    logger.error(error.message);
    return response.customError({
      statusCode: getHTTPResponseCode(error),
      body: { message: error.message },
    });
  }

  // handle any older Boom-based errors or the few places our app uses them
  if (isBoom(error)) {
    // only log the message
    logger.error(error.output.payload.message);
    return response.customError({
      statusCode: error.output.statusCode,
      body: { message: error.output.payload.message },
    });
  }

  // not sure what type of error this is. log as much as possible
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
