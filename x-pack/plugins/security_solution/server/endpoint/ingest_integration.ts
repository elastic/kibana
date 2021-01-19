/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ExceptionListClient } from '../../../lists/server';
import { PluginStartContract as AlertsStartContract } from '../../../alerts/server';
import { SecurityPluginSetup } from '../../../security/server';
import { ExternalCallback } from '../../../fleet/server';
import { KibanaRequest, Logger, RequestHandlerContext } from '../../../../../src/core/server';
import { NewPackagePolicy, UpdatePackagePolicy } from '../../../fleet/common/types/models';
import { factory as policyConfigFactory } from '../../common/endpoint/models/policy_config';
import { NewPolicyData } from '../../common/endpoint/types';
import { ManifestManager } from './services/artifacts';
import { Manifest } from './lib/artifacts';
import { reportErrors } from './lib/artifacts/common';
import { InternalArtifactCompleteSchema } from './schemas/artifacts';
import { manifestDispatchSchema } from '../../common/endpoint/schema/manifest';
import { AppClientFactory } from '../client';
import { createDetectionIndex } from '../lib/detection_engine/routes/index/create_index_route';
import { createPrepackagedRules } from '../lib/detection_engine/routes/rules/add_prepackaged_rules_route';
import { buildFrameworkRequest } from '../lib/timeline/routes/utils/common';
import { isEndpointPolicyValidForLicense } from '../../common/license/policy_config';
import { LicenseService } from '../../common/license/license';

const getManifest = async (logger: Logger, manifestManager: ManifestManager): Promise<Manifest> => {
  let manifest: Manifest | null = null;

  try {
    manifest = await manifestManager.getLastComputedManifest();

    // If we have not yet computed a manifest, then we have to do so now. This should only happen
    // once.
    if (manifest == null) {
      // New computed manifest based on current state of exception list
      const newManifest = await manifestManager.buildNewManifest();
      const diffs = newManifest.diff(Manifest.getDefault());

      // Compress new artifacts
      const adds = diffs.filter((diff) => diff.type === 'add').map((diff) => diff.id);
      for (const artifactId of adds) {
        const compressError = await newManifest.compressArtifact(artifactId);
        if (compressError) {
          throw compressError;
        }
      }

      // Persist new artifacts
      const artifacts = adds
        .map((artifactId) => newManifest.getArtifact(artifactId))
        .filter((artifact): artifact is InternalArtifactCompleteSchema => artifact !== undefined);
      if (artifacts.length !== adds.length) {
        throw new Error('Invalid artifact encountered.');
      }
      const persistErrors = await manifestManager.pushArtifacts(artifacts);
      if (persistErrors.length) {
        reportErrors(logger, persistErrors);
        throw new Error('Unable to persist new artifacts.');
      }

      // Commit the manifest state
      if (diffs.length) {
        const error = await manifestManager.commit(newManifest);
        if (error) {
          throw error;
        }
      }

      manifest = newManifest;
    }
  } catch (err) {
    logger.error(err);
  }

  return manifest ?? Manifest.getDefault();
};

/**
 * Callback to handle creation of PackagePolicies in Fleet
 */
export const getPackagePolicyCreateCallback = (
  logger: Logger,
  manifestManager: ManifestManager,
  appClientFactory: AppClientFactory,
  maxTimelineImportExportSize: number,
  securitySetup: SecurityPluginSetup,
  alerts: AlertsStartContract,
  exceptionsClient: ExceptionListClient | undefined
): ExternalCallback[1] => {
  const handlePackagePolicyCreate = async (
    newPackagePolicy: NewPackagePolicy,
    context: RequestHandlerContext,
    request: KibanaRequest
  ): Promise<NewPackagePolicy> => {
    // We only care about Endpoint package policies
    if (newPackagePolicy.package?.name !== 'endpoint') {
      return newPackagePolicy;
    }

    // prep for detection rules creation
    const appClient = appClientFactory.create(request);
    const frameworkRequest = await buildFrameworkRequest(context, securitySetup, request);

    // Create detection index & rules (if necessary). move past any failure, this is just a convenience
    try {
      await createDetectionIndex(context, appClient);
    } catch (err) {
      if (err.statusCode !== 409) {
        // 409 -> detection index already exists, which is fine
        logger.warn(
          `Possible problem creating detection signals index (${err.statusCode}): ${err.message}`
        );
      }
    }
    try {
      // this checks to make sure index exists first, safe to try in case of failure above
      // may be able to recover from minor errors
      await createPrepackagedRules(
        context,
        appClient,
        alerts.getAlertsClientWithRequest(request),
        frameworkRequest,
        maxTimelineImportExportSize,
        exceptionsClient
      );
    } catch (err) {
      logger.error(
        `Unable to create detection rules automatically (${err.statusCode}): ${err.message}`
      );
    }

    // Get most recent manifest
    const manifest = await getManifest(logger, manifestManager);
    const serializedManifest = manifest.toEndpointFormat();
    if (!manifestDispatchSchema.is(serializedManifest)) {
      // This should not happen.
      // But if it does, we log it and return it anyway.
      logger.error('Invalid manifest');
    }

    // We cast the type here so that any changes to the Endpoint specific data
    // follow the types/schema expected
    let updatedPackagePolicy = newPackagePolicy as NewPolicyData;

    // Until we get the Default Policy Configuration in the Endpoint package,
    // we will add it here manually at creation time.
    updatedPackagePolicy = {
      ...newPackagePolicy,
      inputs: [
        {
          type: 'endpoint',
          enabled: true,
          streams: [],
          config: {
            artifact_manifest: {
              value: serializedManifest,
            },
            policy: {
              value: policyConfigFactory(),
            },
          },
        },
      ],
    };

    return updatedPackagePolicy;
  };

  return handlePackagePolicyCreate;
};

export const getPackagePolicyUpdateCallback = (
  logger: Logger,
  licenseService: LicenseService
): ExternalCallback[1] => {
  const handlePackagePolicyUpdate = async (
    newPackagePolicy: NewPackagePolicy,
    context: RequestHandlerContext,
    request: KibanaRequest
  ): Promise<UpdatePackagePolicy> => {
    if (newPackagePolicy.package?.name !== 'endpoint') {
      return newPackagePolicy;
    }

    if (
      !isEndpointPolicyValidForLicense(
        newPackagePolicy.inputs[0].config?.policy?.value,
        licenseService.getLicenseInformation()
      )
    ) {
      logger.warn('Incorrect license tier for paid policy fields');
      const licenseError: Error & { statusCode?: number } = new Error('Requires Platinum license');
      licenseError.statusCode = 403;
      throw licenseError;
    }
    return newPackagePolicy;
  };
  return handlePackagePolicyUpdate;
};
