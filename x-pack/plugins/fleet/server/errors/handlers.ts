/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom, { isBoom } from '@hapi/boom';
import {
  RequestHandlerContext,
  KibanaRequest,
  IKibanaResponse,
  KibanaResponseFactory,
} from 'src/core/server';
import { errors as LegacyESErrors } from 'elasticsearch';
import { ResponseError } from '@elastic/elasticsearch/lib/errors';
import { appContextService } from '../services';
import {
  IngestManagerError,
  RegistryError,
  PackageNotFoundError,
  AgentPolicyNameExistsError,
  PackageUnsupportedMediaTypeError,
  ConcurrentInstallOperationError,
} from './index';

type IngestErrorHandler = (
  params: IngestErrorHandlerParams
) => IKibanaResponse | Promise<IKibanaResponse>;
interface IngestErrorHandlerParams {
  error: IngestManagerError | Boom.Boom | Error;
  response: KibanaResponseFactory;
  request?: KibanaRequest;
  context?: RequestHandlerContext;
}
// unsure if this is correct. would prefer to use something "official"
// this type is based on BadRequest values observed while debugging https://github.com/elastic/kibana/issues/75862

interface LegacyESClientError {
  message: string;
  stack: string;
  status: number;
  displayName: string;
  path?: string;
  query?: string | undefined;
  body?: {
    error: {
      type: string;
    };
    status: number;
  };
  statusCode?: number;
  response?: string;
}
export const isLegacyESClientError = (error: any): error is LegacyESClientError => {
  return error instanceof LegacyESErrors._Abstract;
};

export function isESClientError(error: unknown): error is ResponseError {
  return error instanceof ResponseError;
}

const getHTTPResponseCode = (error: IngestManagerError): number => {
  if (error instanceof RegistryError) {
    return 502; // Bad Gateway
  }
  if (error instanceof PackageNotFoundError) {
    return 404; // Not Found
  }
  if (error instanceof AgentPolicyNameExistsError) {
    return 409; // Conflict
  }
  if (error instanceof PackageUnsupportedMediaTypeError) {
    return 415; // Unsupported Media Type
  }
  if (error instanceof ConcurrentInstallOperationError) {
    return 409; // Conflict
  }
  return 400; // Bad Request
};

export function ingestErrorToResponseOptions(error: IngestErrorHandlerParams['error']) {
  const logger = appContextService.getLogger();
  if (isLegacyESClientError(error)) {
    // there was a problem communicating with ES (e.g. via `callCluster`)
    // only log the message
    const message =
      error?.path && error?.response
        ? // if possible, return the failing endpoint and its response
          `${error.message} response from ${error.path}: ${error.response}`
        : error.message;

    logger.error(message);

    return {
      statusCode: error?.statusCode || error.status,
      body: { message },
    };
  }

  // our "expected" errors
  if (error instanceof IngestManagerError) {
    // only log the message
    logger.error(error.message);
    return {
      statusCode: getHTTPResponseCode(error),
      body: { message: error.message },
    };
  }

  // handle any older Boom-based errors or the few places our app uses them
  if (isBoom(error)) {
    // only log the message
    logger.error(error.output.payload.message);
    return {
      statusCode: error.output.statusCode,
      body: { message: error.output.payload.message },
    };
  }

  // not sure what type of error this is. log as much as possible
  logger.error(error);
  return {
    statusCode: 500,
    body: { message: error.message },
  };
}

export const defaultIngestErrorHandler: IngestErrorHandler = async ({
  error,
  response,
}: IngestErrorHandlerParams): Promise<IKibanaResponse> => {
  const options = ingestErrorToResponseOptions(error);
  return response.customError(options);
};
