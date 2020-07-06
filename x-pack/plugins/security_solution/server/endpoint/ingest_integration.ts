/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { NewPackageConfig } from '../../../ingest_manager/common/types/models';
import { factory as policyConfigFactory } from '../../common/endpoint/models/policy_config';
import { NewPolicyData } from '../../common/endpoint/types';
import { ManifestManager } from './services/artifacts';

/**
 * Callback to handle creation of PackageConfigs in Ingest Manager
 */
export const getPackageConfigCreateCallback = (
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
      // TODO: log error... should not be in this state
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
        // const created = await manifestManager.confirmPackageConfigExists(updatedPackageConfig.name);
        const created = true;
        if (created) {
          await manifestManager.commit(snapshot.manifest);

          // clean up old artifacts
          await manifestManager.syncArtifacts(snapshot, 'delete');
        } else {
          // TODO: log error
        }
      }
    }
  };

  return handlePackageConfigCreate;
};
