/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type Boom from '@hapi/boom';
import { isBoom } from '@hapi/boom';

import type {
  IKibanaResponse,
  KibanaResponseFactory,
  RequestHandlerContext,
} from '@kbn/core/server';
import type { KibanaRequest } from '@kbn/core/server';

import { UninstallTokenError } from '../../common/errors';

import { appContextService } from '../services';

import {
  AgentPolicyNameExistsError,
  ConcurrentInstallOperationError,
  FleetError,
  PackageUnsupportedMediaTypeError,
  RegistryConnectionError,
  RegistryError,
  RegistryResponseError,
  PackageFailedVerificationError,
  FleetUnauthorizedError,
  PackagePolicyNameExistsError,
  PackageOutdatedError,
  PackageInvalidArchiveError,
  BundledPackageLocationNotFoundError,
  PackageRemovalError,
  PackageESError,
  KibanaSOReferenceError,
  PackageAlreadyInstalledError,
  AgentPolicyInvalidError,
  EnrollmentKeyNameExistsError,
  AgentRequestInvalidError,
  PackagePolicyRequestError,
  FleetNotFoundError,
  PackageSavedObjectConflictError,
  FleetTooManyRequestsError,
  AgentlessPolicyExistsRequestError,
  PackageInvalidDeploymentMode,
  PackagePolicyContentPackageError,
} from '.';

type IngestErrorHandler = (
  params: IngestErrorHandlerParams
) => IKibanaResponse | Promise<IKibanaResponse>;
interface IngestErrorHandlerParams {
  error: FleetError | Boom.Boom | Error;
  response: KibanaResponseFactory;
  request?: KibanaRequest;
  context?: RequestHandlerContext;
}
// unsure if this is correct. would prefer to use something "official"
// this type is based on BadRequest values observed while debugging https://github.com/elastic/kibana/issues/75862
const getHTTPResponseCode = (error: FleetError): number => {
  // Bad Request
  if (error instanceof PackageInvalidDeploymentMode) {
    return 400;
  }
  if (error instanceof PackageFailedVerificationError) {
    return 400;
  }
  if (error instanceof PackageOutdatedError) {
    return 400;
  }
  if (error instanceof PackageInvalidArchiveError) {
    return 400;
  }
  if (error instanceof PackageRemovalError) {
    return 400;
  }
  if (error instanceof KibanaSOReferenceError) {
    return 400;
  }
  if (error instanceof AgentPolicyInvalidError) {
    return 400;
  }
  if (error instanceof AgentRequestInvalidError) {
    return 400;
  }
  if (error instanceof PackagePolicyRequestError) {
    return 400;
  }
  if (error instanceof PackagePolicyContentPackageError) {
    return 400;
  }
  // Unauthorized
  if (error instanceof FleetUnauthorizedError) {
    return 403;
  }
  // Not Found
  if (error instanceof FleetNotFoundError) {
    return 404;
  }

  // Conflict
  if (error instanceof AgentPolicyNameExistsError) {
    return 409;
  }
  if (error instanceof EnrollmentKeyNameExistsError) {
    return 409;
  }
  if (error instanceof ConcurrentInstallOperationError) {
    return 409;
  }
  if (error instanceof PackageSavedObjectConflictError) {
    return 409;
  }
  if (error instanceof PackagePolicyNameExistsError) {
    return 409;
  }
  if (error instanceof PackageAlreadyInstalledError) {
    return 409;
  }
  if (error instanceof AgentlessPolicyExistsRequestError) {
    return 409;
  }
  // Unsupported Media Type
  if (error instanceof PackageUnsupportedMediaTypeError) {
    return 415;
  }
  // Too many requests
  if (error instanceof FleetTooManyRequestsError) {
    return 429;
  }
  // Internal Server Error
  if (error instanceof UninstallTokenError) {
    return 500;
  }
  if (error instanceof BundledPackageLocationNotFoundError) {
    return 500;
  }
  if (error instanceof PackageESError) {
    return 500;
  }
  if (error instanceof RegistryResponseError) {
    // 4xx/5xx's from EPR
    return 500;
  }
  // Bad Gateway
  if (error instanceof RegistryConnectionError || error instanceof RegistryError) {
    // Connection errors (ie. RegistryConnectionError) / fallback  (RegistryError) from EPR
    return 502;
  }

  return 400; // Bad Request
};

export function fleetErrorToResponseOptions(error: IngestErrorHandlerParams['error']) {
  const logger = appContextService.getLogger();
  // our "expected" errors
  if (error instanceof FleetError) {
    // only log the message
    logger.error(error.message);
    return {
      statusCode: getHTTPResponseCode(error),
      body: {
        message: error.message,
        ...(error.attributes && { attributes: error.attributes }),
      },
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

  // default response is 500
  logger.error(error);
  return {
    statusCode: 500,
    body: { message: error.message },
  };
}

export const defaultFleetErrorHandler: IngestErrorHandler = async ({
  error,
  response,
}: IngestErrorHandlerParams): Promise<IKibanaResponse> => {
  const options = fleetErrorToResponseOptions(error);
  return response.customError(options);
};
