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

    // get snapshot based on exception-list-agnostic SOs
    // with diffs from last dispatched manifest, if it exists
    const snapshot = await manifestManager.getSnapshot({ initialize: true });

    if (snapshot === null) {
      logger.warn('No manifest snapshot available.');
      return updatedPackageConfig;
    }

    if (snapshot.diffs.length > 0) {
      // create new artifacts
      await manifestManager.syncArtifacts(snapshot, 'add');

      // Until we get the Default Policy Configuration in the Endpoint package,
      // we will add it here manually at creation time.
      // @ts-ignore
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
                  value: snapshot.manifest.toEndpointFormat(),
                },
                policy: {
                  value: policyConfigFactory(),
                },
              },
            },
          ],
        };
      }
    }

    try {
      return updatedPackageConfig;
    } finally {
      if (snapshot.diffs.length > 0) {
        // TODO: let's revisit the way this callback happens... use promises?
        // only commit when we know the package config was created
        try {
          await manifestManager.commit(snapshot.manifest);

          // clean up old artifacts
          await manifestManager.syncArtifacts(snapshot, 'delete');
        } catch (err) {
          logger.error(err);
        }
      }
    }
  };

  return handlePackageConfigCreate;
};
