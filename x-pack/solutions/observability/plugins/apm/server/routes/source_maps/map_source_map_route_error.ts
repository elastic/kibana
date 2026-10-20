/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import {
  ArtifactsElasticsearchError,
  BundledPackageLocationNotFoundError,
  FleetError,
  FleetErrorWithStatusCode,
  FleetNotFoundError,
  FleetTooManyRequestsError,
  FleetUnauthorizedError,
  isESClientError,
  PackageAlreadyInstalledError,
  PackageESError,
  PackagePolicyNameExistsError,
  PackageSavedObjectConflictError,
  RegistryConnectionError,
  RegistryError,
  RegistryResponseError,
} from '@kbn/fleet-plugin/server/errors';

/**
 * Maps source-map route failures to Boom errors with the right HTTP status.
 *
 * Fleet artifact/policy operations throw FleetError (not Boom). Re-wrapping those
 * as Boom.internal(500) caused high-volume ERROR logs via register_apm_server_routes
 * (logger.error for statusCode >= 500). Preserve Boom, map known Fleet/ES client
 * errors to <500 when appropriate, and only use 500 for unexpected failures.
 */
export function throwMappedSourceMapRouteError(error: unknown, fallbackMessage: string): never {
  if (Boom.isBoom(error)) {
    throw error;
  }

  if (isESClientError(error)) {
    throw boomifyWithStatus(error, error.meta.statusCode, fallbackMessage);
  }

  if (error instanceof ArtifactsElasticsearchError && isESClientError(error.meta)) {
    throw boomifyWithStatus(error, error.meta.meta.statusCode, fallbackMessage);
  }

  if (error instanceof FleetError) {
    throw new Boom.Boom(error.message, {
      statusCode: getFleetErrorStatusCode(error),
    });
  }

  throw Boom.internal(fallbackMessage, error instanceof Error ? error : undefined);
}

function boomifyWithStatus(
  error: Error,
  statusCode: number | undefined,
  fallbackMessage: string
): never {
  if (typeof statusCode === 'number' && statusCode < 500) {
    throw Boom.boomify(error, { statusCode });
  }

  throw Boom.internal(fallbackMessage, error);
}

/**
 * Mirrors Fleet's getHTTPResponseCode for statuses that matter to source-map
 * routes (4xx client errors and 5xx/502 server failures). Intentionally avoids
 * fleetErrorToResponseOptions so we do not double-log via Fleet's appContext logger.
 */
function getFleetErrorStatusCode(error: FleetError): number {
  if (error instanceof FleetUnauthorizedError) {
    return 403;
  }
  if (error instanceof FleetNotFoundError) {
    return 404;
  }
  if (
    error instanceof PackagePolicyNameExistsError ||
    error instanceof PackageSavedObjectConflictError ||
    error instanceof PackageAlreadyInstalledError
  ) {
    return 409;
  }
  if (error instanceof FleetTooManyRequestsError) {
    return 429;
  }
  // Keep genuine Fleet/registry/ES package failures as 5xx so they still ERROR-log.
  if (
    error instanceof BundledPackageLocationNotFoundError ||
    error instanceof PackageESError ||
    error instanceof RegistryResponseError
  ) {
    return 500;
  }
  if (error instanceof RegistryConnectionError || error instanceof RegistryError) {
    return 502;
  }
  if (error instanceof FleetErrorWithStatusCode && typeof error.statusCode === 'number') {
    return error.statusCode;
  }

  // Fleet maps remaining FleetError subclasses to 400 by default.
  return 400;
}
