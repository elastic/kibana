/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file */
import type { ElasticsearchErrorDetails } from '@kbn/es-errors';

import { FleetError } from '../../common/errors';

import { isESClientError } from './utils';
export {
  defaultFleetErrorHandler as defaultFleetErrorHandler,
  fleetErrorToResponseOptions,
} from './handlers';

export { isESClientError } from './utils';
export { FleetError as FleetError } from '../../common/errors';

export class RegistryError extends FleetError {}
export class RegistryConnectionError extends RegistryError {}
export class RegistryResponseError extends RegistryError {
  constructor(message?: string, public readonly status?: number) {
    super(message);
  }
}
export class PackageNotFoundError extends FleetError {}
export class PackageKeyInvalidError extends FleetError {}
export class PackageOutdatedError extends FleetError {}
export class PackageFailedVerificationError extends FleetError {
  constructor(pkgName: string, pkgVersion: string) {
    super(`${pkgName}-${pkgVersion} failed signature verification.`);
    this.attributes = {
      type: 'verification_failed',
    };
  }
}
export class AgentPolicyError extends FleetError {}
export class AgentPolicyNotFoundError extends FleetError {}
export class AgentNotFoundError extends FleetError {}
export class AgentActionNotFoundError extends FleetError {}
export class AgentPolicyNameExistsError extends AgentPolicyError {}
export class PackageUnsupportedMediaTypeError extends FleetError {}
export class PackageInvalidArchiveError extends FleetError {}
export class PackageCacheError extends FleetError {}
export class PackageOperationNotSupportedError extends FleetError {}
export class ConcurrentInstallOperationError extends FleetError {}
export class AgentReassignmentError extends FleetError {}
export class PackagePolicyIneligibleForUpgradeError extends FleetError {}
export class PackagePolicyValidationError extends FleetError {}
export class PackagePolicyNameExistsError extends FleetError {}
export class PackagePolicyNotFoundError extends FleetError {}
export class BundledPackageNotFoundError extends FleetError {}
export class HostedAgentPolicyRestrictionRelatedError extends FleetError {
  constructor(message = 'Cannot perform that action') {
    super(
      `${message} in Fleet because the agent policy is managed by an external orchestration solution, such as Elastic Cloud, Kubernetes, etc. Please make changes using your orchestration solution.`
    );
  }
}
export class PackagePolicyRestrictionRelatedError extends FleetError {
  constructor(message = 'Cannot perform that action') {
    super(
      `${message} in Fleet because the package policy is managed by an external orchestration solution, such as Elastic Cloud, Kubernetes, etc. Please make changes using your orchestration solution.`
    );
  }
}
export class FleetEncryptedSavedObjectEncryptionKeyRequired extends FleetError {}
export class FleetSetupError extends FleetError {}
export class GenerateServiceTokenError extends FleetError {}
export class FleetUnauthorizedError extends FleetError {}

export class OutputUnauthorizedError extends FleetError {}
export class OutputInvalidError extends FleetError {}
export class OutputLicenceError extends FleetError {}
export class DownloadSourceError extends FleetError {}

export class FleetServerHostUnauthorizedError extends FleetError {}
export class FleetProxyUnauthorizedError extends FleetError {}

export class ArtifactsClientError extends FleetError {}
export class ArtifactsClientAccessDeniedError extends FleetError {
  constructor(deniedPackageName: string, allowedPackageName: string) {
    super(
      `Access denied. Artifact package name (${deniedPackageName}) does not match ${allowedPackageName}`
    );
  }
}
export class ArtifactsElasticsearchError extends FleetError {
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

export class FleetFilesClientError extends FleetError {}
export class FleetFileNotFound extends FleetFilesClientError {}
