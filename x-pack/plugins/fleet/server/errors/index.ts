/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file */
export {
  defaultIngestErrorHandler,
  ingestErrorToResponseOptions,
  isLegacyESClientError,
  isESClientError,
} from './handlers';

export class IngestManagerError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = this.constructor.name; // for stack traces
  }
}
export class RegistryError extends IngestManagerError {}
export class RegistryConnectionError extends RegistryError {}
export class RegistryResponseError extends RegistryError {}
export class PackageNotFoundError extends IngestManagerError {}
export class PackageOutdatedError extends IngestManagerError {}
export class AgentPolicyError extends IngestManagerError {}
export class AgentPolicyNameExistsError extends AgentPolicyError {}
export class PackageUnsupportedMediaTypeError extends IngestManagerError {}
export class PackageInvalidArchiveError extends IngestManagerError {}
export class PackageCacheError extends IngestManagerError {}
export class PackageOperationNotSupportedError extends IngestManagerError {}
export class FleetAdminUserInvalidError extends IngestManagerError {}
export class ConcurrentInstallOperationError extends IngestManagerError {}
export class AgentReassignmentError extends IngestManagerError {}
export class AgentUnenrollmentError extends IngestManagerError {}
export class AgentPolicyDeletionError extends IngestManagerError {}
