/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger } from '../../../../../src/core/server';
import { NewPackageConfig } from '../../../ingest_manager/common/types/models';
import { factory as policyConfigFactory } from '../../common/endpoint/models/policy_config';
import { NewPolicyData } from '../../common/endpoint/types';
import { ManifestManager } from './services/artifacts';
import { Manifest } from './lib/artifacts';
import { reportErrors, ManifestConstants } from './lib/artifacts/common';
import { InternalArtifactCompleteSchema } from './schemas/artifacts';
import { manifestDispatchSchema } from '../../common/endpoint/schema/manifest';

const getManifest = async (logger: Logger, manifestManager: ManifestManager): Promise<Manifest> => {
  let manifest: Manifest | null = null;

  try {
    manifest = await manifestManager.getLastComputedManifest(ManifestConstants.SCHEMA_VERSION);

    // If we have not yet computed a manifest, then we have to do so now. This should only happen
    // once.
    if (manifest == null) {
      // New computed manifest based on current state of exception list
      const newManifest = await manifestManager.buildNewManifest(ManifestConstants.SCHEMA_VERSION);
      const diffs = newManifest.diff(Manifest.getDefault(ManifestConstants.SCHEMA_VERSION));

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

  return manifest ?? Manifest.getDefault(ManifestConstants.SCHEMA_VERSION);
};

/**
 * Callback to handle creation of PackageConfigs in Ingest Manager
 */
export const getPackageConfigCreateCallback = (
  logger: Logger,
  manifestManager: ManifestManager
): ((newPackageConfig: NewPackageConfig) => Promise<NewPackageConfig>) => {
  const handlePackageConfigCreate = async (
    newPackageConfig: NewPackageConfig
  ): Promise<NewPackageConfig> => {
    // We only care about Endpoint package configs
    if (newPackageConfig.package?.name !== 'endpoint') {
      return newPackageConfig;
    }

    // We cast the type here so that any changes to the Endpoint specific data
    // follow the types/schema expected
    let updatedPackageConfig = newPackageConfig as NewPolicyData;

    // Get most recent manifest
    const manifest = await getManifest(logger, manifestManager);
    const serializedManifest = manifest.toEndpointFormat();
    if (!manifestDispatchSchema.is(serializedManifest)) {
      // This should not happen.
      // But if it does, we log it and return it anyway.
      logger.error('Invalid manifest');
    }

    // Until we get the Default Policy Configuration in the Endpoint package,
    // we will add it here manually at creation time.
    updatedPackageConfig = {
      ...newPackageConfig,
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

    return updatedPackageConfig;
  };

  return handlePackageConfigCreate;
};
