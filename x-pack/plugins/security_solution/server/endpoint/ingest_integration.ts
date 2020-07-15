/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger } from '../../../../../src/core/server';
import { NewPackageConfig } from '../../../ingest_manager/common/types/models';
import { factory as policyConfigFactory } from '../../common/endpoint/models/policy_config';
import { NewPolicyData } from '../../common/endpoint/types';
import { ManifestManager, ManifestSnapshot } from './services/artifacts';
import { Manifest } from './lib/artifacts';
import { reportErrors, ManifestConstants } from './lib/artifacts/common';

const getManifestSnapshot = async (
  logger: Logger,
  manifestManager: ManifestManager
): Promise<ManifestSnapshot> => {
  let manifest: Manifest | null = null;

  try {
    manifest = await manifestManager.getLastDispatchedManifest(ManifestConstants.SCHEMA_VERSION);
  } catch (err) {
    logger.error(err);
  }

  if (manifest === null) {
    try {
      // This creates a new manifest if it does not exist
      const snapshot = await manifestManager.getSnapshot({ initialize: true });

      if (snapshot && snapshot.diffs.length) {
        // create new artifacts
        const errors = await manifestManager.syncArtifacts(snapshot, 'add');
        if (errors.length) {
          reportErrors(logger, errors);
          throw new Error('Error writing new artifacts.');
        }
      } else if (snapshot === null) {
        throw new Error('Snapshot not available.');
      }

      return snapshot;
    } catch (err) {
      logger.error(err);
    }
  }

  return {
    manifest: manifest ?? Manifest.getDefault(ManifestConstants.SCHEMA_VERSION),
    diffs: [],
  };
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

    // get current manifest from SO (last dispatched)
    const snapshot = await getManifestSnapshot(logger, manifestManager);

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
              value: snapshot.manifest.toEndpointFormat(),
            },
            policy: {
              value: policyConfigFactory(),
            },
          },
        },
      ],
    };

    // TODO: commit the manifest only if policy creation is successful.
    // There should be no diffs, since this is first-run only.
    // commit latest manifest state to user-artifact-manifest SO
    // TODO: think about one manifest SO per policy?
    const error = await manifestManager.commit(snapshot.manifest);
    if (error) {
      reportErrors(logger, [error]);
    }
    // END TODO

    return updatedPackageConfig;
  };

  return handlePackageConfigCreate;
};
