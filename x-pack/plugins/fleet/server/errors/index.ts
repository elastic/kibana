/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file */
import type { ElasticsearchErrorDetails } from '@kbn/core/server';

import { isESClientError } from './utils';

export { defaultIngestErrorHandler, ingestErrorToResponseOptions } from './handlers';

export { isESClientError } from './utils';

export class IngestManagerError extends Error {
  constructor(message?: string, public readonly meta?: unknown) {
    super(message);
    this.name = this.constructor.name; // for stack traces
  }
}

export class RegistryError extends IngestManagerError {}
export class RegistryConnectionError extends RegistryError {}
export class RegistryResponseError extends RegistryError {
  constructor(message?: string, public readonly status?: number) {
    super(message);
  }
}
export class PackageNotFoundError extends IngestManagerError {}
export class PackageKeyInvalidError extends IngestManagerError {}
export class PackageOutdatedError extends IngestManagerError {}
export class AgentPolicyError extends IngestManagerError {}
export class AgentPolicyNotFoundError extends IngestManagerError {}
export class AgentNotFoundError extends IngestManagerError {}
export class AgentPolicyNameExistsError extends AgentPolicyError {}
export class PackageUnsupportedMediaTypeError extends IngestManagerError {}
export class PackageInvalidArchiveError extends IngestManagerError {}
export class PackageCacheError extends IngestManagerError {}
export class PackageOperationNotSupportedError extends IngestManagerError {}
export class ConcurrentInstallOperationError extends IngestManagerError {}
export class AgentReassignmentError extends IngestManagerError {}
export class PackagePolicyIneligibleForUpgradeError extends IngestManagerError {}
export class PackagePolicyValidationError extends IngestManagerError {}
export class BundledPackageNotFoundError extends IngestManagerError {}
export class HostedAgentPolicyRestrictionRelatedError extends IngestManagerError {
  constructor(message = 'Cannot perform that action') {
    super(
      `${message} in Fleet because the agent policy is managed by an external orchestration solution, such as Elastic Cloud, Kubernetes, etc. Please make changes using your orchestration solution.`
    );
  }
}
export class FleetEncryptedSavedObjectEncryptionKeyRequired extends IngestManagerError {}
export class FleetSetupError extends IngestManagerError {}
export class GenerateServiceTokenError extends IngestManagerError {}
export class FleetUnauthorizedError extends IngestManagerError {}

export class OutputUnauthorizedError extends IngestManagerError {}
export class OutputInvalidError extends IngestManagerError {}
export class OutputLicenceError extends IngestManagerError {}

export class ArtifactsClientError extends IngestManagerError {}
export class ArtifactsClientAccessDeniedError extends IngestManagerError {
  constructor(deniedPackageName: string, allowedPackageName: string) {
    super(
      `Access denied. Artifact package name (${deniedPackageName}) does not match ${allowedPackageName}`
    );
  }
}
export class ArtifactsElasticsearchError extends IngestManagerError {
  readonly requestDetails: string;

  constructor(public readonly meta: Error) {
    super(
      `${
        isESClientError(meta) && (meta.meta.body as ElasticsearchErrorDetails)?.error?.reason
          ? (meta.meta.body as ElasticsearchErrorDetails)?.error?.reason
          : `Elasticsearch error while working with artifacts: ${meta.message}`
      }`
    );

    if (isESClientError(meta)) {
      const { method, path, querystring = '', body = '' } = meta.meta.meta.request.params;
      this.requestDetails = `${method} ${path}${querystring ? `?${querystring}` : ''}${
        body ? `\n${body}` : ''
      }`;
    } else {
      this.requestDetails = 'unable to determine request details';
    }
  }
}
