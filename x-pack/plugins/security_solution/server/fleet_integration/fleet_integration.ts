/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { ExceptionListClient } from '@kbn/lists-plugin/server';
import type { PluginStartContract as AlertsStartContract } from '@kbn/alerting-plugin/server';
import type {
  PostPackagePolicyCreateCallback,
  PostPackagePolicyPostDeleteCallback,
  PutPackagePolicyUpdateCallback,
  PostPackagePolicyPostCreateCallback,
} from '@kbn/fleet-plugin/server';

import type {
  NewPackagePolicy,
  PackagePolicy,
  UpdatePackagePolicy,
} from '@kbn/fleet-plugin/common';
import type { NewPolicyData, PolicyConfig } from '../../common/endpoint/types';
import type { LicenseService } from '../../common/license';
import type { ManifestManager } from '../endpoint/services';
import type { IRequestContextFactory } from '../request_context_factory';
import { installPrepackagedRules } from './handlers/install_prepackaged_rules';
import { createPolicyArtifactManifest } from './handlers/create_policy_artifact_manifest';
import { createDefaultPolicy } from './handlers/create_default_policy';
import { validatePolicyAgainstLicense } from './handlers/validate_policy_against_license';
import { validateIntegrationConfig } from './handlers/validate_integration_config';
import { removePolicyFromArtifacts } from './handlers/remove_policy_from_artifacts';
import type { FeatureUsageService } from '../endpoint/services/feature_usage/service';
import type { EndpointMetadataService } from '../endpoint/services/metadata';
import { notifyProtectionFeatureUsage } from './notify_protection_feature_usage';
import type { AnyPolicyCreateConfig } from './types';
import { ENDPOINT_INTEGRATION_CONFIG_KEY } from './constants';
import { createEventFilters } from './handlers/create_event_filters';

const isEndpointPackagePolicy = <T extends { package?: { name: string } }>(
  packagePolicy: T
): boolean => {
  return packagePolicy.package?.name === 'endpoint';
};

/**
 * Callback to handle creation of PackagePolicies in Fleet
 */
export const getPackagePolicyCreateCallback = (
  logger: Logger,
  manifestManager: ManifestManager,
  securitySolutionRequestContextFactory: IRequestContextFactory,
  alerts: AlertsStartContract,
  licenseService: LicenseService,
  exceptionsClient: ExceptionListClient | undefined
): PostPackagePolicyCreateCallback => {
  return async (
    newPackagePolicy,
    soClient,
    esClient,
    context,
    request
  ): Promise<NewPackagePolicy> => {
    // callback is called outside request context
    if (!context || !request) {
      return newPackagePolicy;
    }

    // We only care about Endpoint package policies
    if (!isEndpointPackagePolicy(newPackagePolicy)) {
      return newPackagePolicy;
    }

    // Optional endpoint integration configuration
    let endpointIntegrationConfig;

    // Check if has endpoint integration configuration input
    const integrationConfigInput = newPackagePolicy?.inputs?.find(
      (input) => input.type === ENDPOINT_INTEGRATION_CONFIG_KEY
    )?.config?._config;

    if (integrationConfigInput?.value) {
      // The cast below is needed in order to ensure proper typing for the
      // Elastic Defend integration configuration
      endpointIntegrationConfig = integrationConfigInput.value as AnyPolicyCreateConfig;

      // Validate that the Elastic Defend integration config is valid
      validateIntegrationConfig(endpointIntegrationConfig, logger);
    }

    // In this callback we are handling an HTTP request to the fleet plugin. Since we use
    // code from the security_solution plugin to handle it (installPrepackagedRules),
    // we need to build the context that is native to security_solution and pass it there.
    const securitySolutionContext = await securitySolutionRequestContextFactory.create(
      context,
      request
    );

    // perform these operations in parallel in order to help in not delaying the API response too much
    const [, manifestValue] = await Promise.all([
      // Install Detection Engine prepackaged rules
      exceptionsClient &&
        installPrepackagedRules({
          logger,
          context: securitySolutionContext,
          request,
          alerts,
          exceptionsClient,
        }),

      // create the Artifact Manifest for this policy
      createPolicyArtifactManifest(logger, manifestManager),
    ]);

    // Add the default endpoint security policy
    const defaultPolicyValue = createDefaultPolicy(licenseService, endpointIntegrationConfig);

    return {
      // We cast the type here so that any changes to the Endpoint
      // specific data follow the types/schema expected
      ...(newPackagePolicy as NewPolicyData),
      inputs: [
        {
          type: 'endpoint',
          enabled: true,
          streams: [],
          config: {
            integration_config: endpointIntegrationConfig
              ? { value: endpointIntegrationConfig }
              : {},
            artifact_manifest: {
              value: manifestValue,
            },
            policy: {
              value: defaultPolicyValue,
            },
          },
        },
      ],
    };
  };
};

export const getPackagePolicyUpdateCallback = (
  logger: Logger,
  licenseService: LicenseService,
  featureUsageService: FeatureUsageService,
  endpointMetadataService: EndpointMetadataService
): PutPackagePolicyUpdateCallback => {
  return async (newPackagePolicy: NewPackagePolicy): Promise<UpdatePackagePolicy> => {
    if (!isEndpointPackagePolicy(newPackagePolicy)) {
      return newPackagePolicy;
    }

    // Validate that Endpoint Security policy is valid against current license
    validatePolicyAgainstLicense(
      // The cast below is needed in order to ensure proper typing for
      // the policy configuration specific for endpoint
      newPackagePolicy.inputs[0].config?.policy?.value as PolicyConfig,
      licenseService,
      logger
    );

    notifyProtectionFeatureUsage(newPackagePolicy, featureUsageService, endpointMetadataService);

    return newPackagePolicy;
  };
};

export const getPackagePolicyPostCreateCallback = (
  logger: Logger,
  exceptionsClient: ExceptionListClient | undefined
): PostPackagePolicyPostCreateCallback => {
  return async (packagePolicy: PackagePolicy): Promise<PackagePolicy> => {
    // We only care about Endpoint package policies
    if (!exceptionsClient || !isEndpointPackagePolicy(packagePolicy)) {
      return packagePolicy;
    }

    const integrationConfig = packagePolicy?.inputs[0]?.config?.integration_config;

    if (integrationConfig && integrationConfig?.value?.eventFilters !== undefined) {
      createEventFilters(
        logger,
        exceptionsClient,
        integrationConfig.value.eventFilters,
        packagePolicy
      );
    }
    return packagePolicy;
  };
};

export const getPackagePolicyDeleteCallback = (
  exceptionsClient: ExceptionListClient | undefined
): PostPackagePolicyPostDeleteCallback => {
  return async (deletePackagePolicy): Promise<void> => {
    if (!exceptionsClient) {
      return;
    }
    const policiesToRemove: Array<Promise<void>> = [];
    for (const policy of deletePackagePolicy) {
      if (isEndpointPackagePolicy(policy)) {
        policiesToRemove.push(removePolicyFromArtifacts(exceptionsClient, policy));
      }
    }
    await Promise.all(policiesToRemove);
  };
};
