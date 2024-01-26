/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
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
import type { CloudSetup } from '@kbn/cloud-plugin/server';
import type { InfoResponse } from '@elastic/elasticsearch/lib/api/types';
import { AppFeatureSecurityKey } from '@kbn/security-solution-features/keys';
import { validateEndpointPackagePolicy } from './handlers/validate_endpoint_package_policy';
import {
  isPolicySetToEventCollectionOnly,
  ensureOnlyEventCollectionIsAllowed,
} from '../../common/endpoint/models/policy_config_helpers';
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
import type { AppFeaturesService } from '../lib/app_features_service/app_features_service';
import { removeProtectionUpdatesNote } from './handlers/remove_protection_updates_note';

const isEndpointPackagePolicy = <T extends { package?: { name: string } }>(
  packagePolicy: T
): boolean => {
  return packagePolicy.package?.name === 'endpoint';
};

const shouldUpdateMetaValues = (
  endpointPackagePolicy: PolicyConfig,
  currentLicenseType: string,
  currentCloudInfo: boolean,
  currentClusterName: string,
  currentClusterUUID: string,
  currentLicenseUUID: string,
  currentIsServerlessEnabled: boolean
) => {
  return (
    endpointPackagePolicy.meta.license !== currentLicenseType ||
    endpointPackagePolicy.meta.cloud !== currentCloudInfo ||
    endpointPackagePolicy.meta.cluster_name !== currentClusterName ||
    endpointPackagePolicy.meta.cluster_uuid !== currentClusterUUID ||
    endpointPackagePolicy.meta.license_uuid !== currentLicenseUUID ||
    endpointPackagePolicy.meta.serverless !== currentIsServerlessEnabled
  );
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
  exceptionsClient: ExceptionListClient | undefined,
  cloud: CloudSetup,
  appFeatures: AppFeaturesService
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
      logger.debug('PackagePolicyCreateCallback called outside request context. Skipping...');
      return newPackagePolicy;
    }

    // We only care about Endpoint package policies
    if (!isEndpointPackagePolicy(newPackagePolicy)) {
      return newPackagePolicy;
    }

    if (newPackagePolicy?.inputs) {
      validateEndpointPackagePolicy(newPackagePolicy.inputs);
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

    const esClientInfo: InfoResponse = await esClient.info();

    // Add the default endpoint security policy
    const defaultPolicyValue = createDefaultPolicy(
      licenseService,
      endpointIntegrationConfig,
      cloud,
      esClientInfo,
      appFeatures
    );

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
  endpointMetadataService: EndpointMetadataService,
  cloud: CloudSetup,
  esClient: ElasticsearchClient,
  appFeatures: AppFeaturesService
): PutPackagePolicyUpdateCallback => {
  return async (newPackagePolicy: NewPackagePolicy): Promise<UpdatePackagePolicy> => {
    if (!isEndpointPackagePolicy(newPackagePolicy)) {
      return newPackagePolicy;
    }

    const endpointIntegrationData = newPackagePolicy as NewPolicyData;

    // Validate that Endpoint Security policy is valid against current license
    validatePolicyAgainstLicense(
      // The cast below is needed in order to ensure proper typing for
      // the policy configuration specific for endpoint
      endpointIntegrationData.inputs[0].config?.policy?.value as PolicyConfig,
      licenseService,
      logger
    );

    validateEndpointPackagePolicy(endpointIntegrationData.inputs);

    notifyProtectionFeatureUsage(
      endpointIntegrationData,
      featureUsageService,
      endpointMetadataService
    );

    const newEndpointPackagePolicy = endpointIntegrationData.inputs[0].config?.policy
      ?.value as PolicyConfig;

    const esClientInfo: InfoResponse = await esClient.info();

    if (
      endpointIntegrationData.inputs[0].config?.policy?.value &&
      shouldUpdateMetaValues(
        newEndpointPackagePolicy,
        licenseService.getLicenseType(),
        cloud?.isCloudEnabled,
        esClientInfo.cluster_name,
        esClientInfo.cluster_uuid,
        licenseService.getLicenseUID(),
        cloud?.isServerlessEnabled
      )
    ) {
      newEndpointPackagePolicy.meta.license = licenseService.getLicenseType();
      newEndpointPackagePolicy.meta.cloud = cloud?.isCloudEnabled;
      newEndpointPackagePolicy.meta.cluster_name = esClientInfo.cluster_name;
      newEndpointPackagePolicy.meta.cluster_uuid = esClientInfo.cluster_uuid;
      newEndpointPackagePolicy.meta.license_uuid = licenseService.getLicenseUID();
      newEndpointPackagePolicy.meta.serverless = cloud?.isServerlessEnabled;

      endpointIntegrationData.inputs[0].config.policy.value = newEndpointPackagePolicy;
    }

    // If no Policy Protection allowed (ex. serverless)
    const eventsOnlyPolicy = isPolicySetToEventCollectionOnly(newEndpointPackagePolicy);
    if (
      !appFeatures.isEnabled(AppFeatureSecurityKey.endpointPolicyProtections) &&
      !eventsOnlyPolicy.isOnlyCollectingEvents
    ) {
      logger.warn(
        `Endpoint integration policy [${endpointIntegrationData.id}][${endpointIntegrationData.name}] adjusted due to [endpointPolicyProtections] appFeature not being enabled. Trigger [${eventsOnlyPolicy.message}]`
      );

      endpointIntegrationData.inputs[0].config.policy.value =
        ensureOnlyEventCollectionIsAllowed(newEndpointPackagePolicy);
    }

    return endpointIntegrationData;
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
  exceptionsClient: ExceptionListClient | undefined,
  savedObjectsClient: SavedObjectsClientContract | undefined
): PostPackagePolicyPostDeleteCallback => {
  return async (deletePackagePolicy): Promise<void> => {
    if (!exceptionsClient) {
      return;
    }
    const policiesToRemove: Array<Promise<void>> = [];
    for (const policy of deletePackagePolicy) {
      if (isEndpointPackagePolicy(policy)) {
        policiesToRemove.push(removePolicyFromArtifacts(exceptionsClient, policy));
        if (savedObjectsClient) {
          policiesToRemove.push(removeProtectionUpdatesNote(savedObjectsClient, policy));
        }
      }
    }

    await Promise.all(policiesToRemove);
  };
};
