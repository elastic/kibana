/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest, Logger, RequestHandlerContext } from 'kibana/server';
import { ExceptionListClient } from '../../../lists/server';
import { PluginStartContract as AlertsStartContract } from '../../../alerting/server';
import {
  PostPackagePolicyCreateCallback,
  PostPackagePolicyDeleteCallback,
  PutPackagePolicyUpdateCallback,
} from '../../../fleet/server';

import { NewPackagePolicy, UpdatePackagePolicy } from '../../../fleet/common';

import { NewPolicyData, PolicyConfig } from '../../common/endpoint/types';
import { LicenseService } from '../../common/license';
import { ManifestManager } from '../endpoint/services';
import { IRequestContextFactory } from '../request_context_factory';
import { installPrepackagedRules } from './handlers/install_prepackaged_rules';
import { createPolicyArtifactManifest } from './handlers/create_policy_artifact_manifest';
import { createDefaultPolicy } from './handlers/create_default_policy';
import { validatePolicyAgainstLicense } from './handlers/validate_policy_against_license';
import { removePolicyFromArtifacts } from './handlers/remove_policy_from_artifacts';
import { FeatureUsageService } from '../endpoint/services/feature_usage/service';
import { EndpointMetadataService } from '../endpoint/services/metadata';
import { notifyProtectionFeatureUsage } from './notify_protection_feature_usage';

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
    newPackagePolicy: NewPackagePolicy,
    context: RequestHandlerContext,
    request: KibanaRequest
  ): Promise<NewPackagePolicy> => {
    // We only care about Endpoint package policies
    if (!isEndpointPackagePolicy(newPackagePolicy)) {
      return newPackagePolicy;
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
    const defaultPolicyValue = createDefaultPolicy(licenseService);

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
  return async (
    newPackagePolicy: NewPackagePolicy
    // context: RequestHandlerContext,
    // request: KibanaRequest
  ): Promise<UpdatePackagePolicy> => {
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

export const getPackagePolicyDeleteCallback = (
  exceptionsClient: ExceptionListClient | undefined
): PostPackagePolicyDeleteCallback => {
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
