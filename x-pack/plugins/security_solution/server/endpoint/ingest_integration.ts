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
import { reportErrors, ManifestConstants } from './lib/artifacts/common';
import { ManifestSchemaVersion } from '../../common/endpoint/schema/common';

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
    const manifest = (
      await manifestManager.getLastDispatchedManifest(ManifestConstants.SCHEMA_VERSION)
    )?.toEndpointFormat() ?? {
      manifest_version: 'default',
      schema_version: ManifestConstants.SCHEMA_VERSION as ManifestSchemaVersion,
      artifacts: {},
    };

    // Until we get the Default Policy Configuration in the Endpoint package,
    // we will add it here manually at creation time.
    if (newPackageConfig.inputs.length === 0) {
      updatedPackageConfig = {
        ...newPackageConfig,
        inputs: [
          {
            type: 'endpoint',
            enabled: true,
            streams: [],
            config: {
              artifact_manifest: {
                value: manifest,
              },
              policy: {
                value: policyConfigFactory(),
              },
            },
          },
        ],
      };
    }

    let snapshot: ManifestSnapshot | null = null;
    let success = true;
    try {
      // Try to get most up-to-date manifest data.

      // get snapshot based on exception-list-agnostic SOs
      // with diffs from last dispatched manifest, if it exists
      snapshot = await manifestManager.getSnapshot({ initialize: true });

      if (snapshot && snapshot.diffs.length) {
        // create new artifacts
        const errors = await manifestManager.syncArtifacts(snapshot, 'add');
        if (errors.length) {
          reportErrors(logger, errors);
          throw new Error('Error writing new artifacts.');
        }
      }

      if (snapshot) {
        updatedPackageConfig.inputs[0].config.artifact_manifest = {
          value: snapshot.manifest.toEndpointFormat(),
        };
      }

      return updatedPackageConfig;
    } catch (err) {
      success = false;
      logger.error(err);
      return updatedPackageConfig;
    } finally {
      if (success && snapshot !== null) {
        try {
          if (snapshot.diffs.length > 0) {
            // TODO: let's revisit the way this callback happens... use promises?
            // only commit when we know the package config was created
            await manifestManager.commit(snapshot.manifest);

            // clean up old artifacts
            await manifestManager.syncArtifacts(snapshot, 'delete');
          }
        } catch (err) {
          logger.error(err);
        }
      } else if (snapshot === null) {
        logger.error('No manifest snapshot available.');
      }
    }
  };

  return handlePackageConfigCreate;
};
