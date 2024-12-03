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

// Package errors

export class PackageInvalidDeploymentMode extends FleetError {}
export class PackageOutdatedError extends FleetError {}
export class PackageFailedVerificationError extends FleetError {
  constructor(pkgName: string, pkgVersion: string) {
    super(`${pkgName}-${pkgVersion} failed signature verification.`);
    this.attributes = {
      type: 'verification_failed',
    };
  }
}
export class PackageUnsupportedMediaTypeError extends FleetError {}
export class PackageInvalidArchiveError extends FleetError {}
export class PackageRemovalError extends FleetError {}
export class PackageESError extends FleetError {}
export class ConcurrentInstallOperationError extends FleetError {}
export class PackageSavedObjectConflictError extends FleetError {}
export class KibanaSOReferenceError extends FleetError {}
export class PackageAlreadyInstalledError extends FleetError {}

export class AgentPolicyError extends FleetError {}
export class AgentRequestInvalidError extends FleetError {}
export class AgentPolicyInvalidError extends FleetError {}

export class AgentlessAgentCreateError extends FleetError {
  constructor(message: string) {
    super(`Error creating agentless agent in Fleet, ${message}`);
  }
}
export class AgentlessAgentDeleteError extends FleetError {
  constructor(message: string) {
    super(`Error deleting agentless agent in Fleet, ${message}`);
  }
}
export class AgentlessAgentConfigError extends FleetError {
  constructor(message: string) {
    super(`Error validating Agentless API configuration in Fleet, ${message}`);
  }
}

export class AgentlessPolicyExistsRequestError extends AgentPolicyError {
  constructor(message: string) {
    super(`Unable to create integration. ${message}`);
  }
}

export class AgentPolicyNameExistsError extends AgentPolicyError {}
export class AgentReassignmentError extends FleetError {}
export class PackagePolicyIneligibleForUpgradeError extends FleetError {}
export class PackagePolicyValidationError extends FleetError {}
export class PackagePolicyNameExistsError extends FleetError {}
export class BundledPackageLocationNotFoundError extends FleetError {}

export class PackagePolicyRequestError extends FleetError {}
export class PackagePolicyMultipleAgentPoliciesError extends FleetError {}
export class PackagePolicyOutputError extends FleetError {}
export class PackagePolicyContentPackageError extends FleetError {}

export class EnrollmentKeyNameExistsError extends FleetError {}
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
export class FleetNotFoundError<TMeta = unknown> extends FleetError<TMeta> {}
export class FleetTooManyRequestsError extends FleetError {}

export class OutputUnauthorizedError extends FleetError {}
export class OutputInvalidError extends FleetError {}
export class OutputLicenceError extends FleetError {}
export class DownloadSourceError extends FleetError {}
export class DeleteUnenrolledAgentsPreconfiguredError extends FleetError {}

// Not found errors
export class AgentNotFoundError extends FleetNotFoundError<{ agentId: string }> {}
export class AgentPolicyNotFoundError extends FleetNotFoundError {}
export class AgentActionNotFoundError extends FleetNotFoundError {}
export class DownloadSourceNotFound extends FleetNotFoundError {}
export class EnrollmentKeyNotFoundError extends FleetNotFoundError {}
export class FleetServerHostNotFoundError extends FleetNotFoundError {}
export class SigningServiceNotFoundError extends FleetNotFoundError {}
export class InputNotFoundError extends FleetNotFoundError {}
export class OutputNotFoundError extends FleetNotFoundError {}
export class PackageNotFoundError extends FleetNotFoundError {}
export class PackagePolicyNotFoundError extends FleetNotFoundError<{
  /** The package policy ID that was not found */
  packagePolicyId: string;
}> {}
export class StreamNotFoundError extends FleetNotFoundError {}

export class FleetServerHostUnauthorizedError extends FleetUnauthorizedError {}
export class FleetProxyUnauthorizedError extends FleetUnauthorizedError {}

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
