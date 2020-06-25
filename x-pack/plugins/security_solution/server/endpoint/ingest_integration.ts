/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { factory as policyConfigFactory } from '../../common/endpoint/models/policy_config';
import { NewPolicyData } from '../../common/endpoint/types';
import { NewDatasource } from '../../../ingest_manager/common/types/models';
import { ManifestManager } from './services/artifacts';

/**
 * Callback to handle creation of Datasources in Ingest Manager
 */
export const getDatasourceCreateCallback = (
  manifestManager: ManifestManager
): ((newDatasource: NewDatasource) => Promise<NewDatasource>) => {
  const handleDatasourceCreate = async (newDatasource: NewDatasource): Promise<NewDatasource> => {
    // We only care about Endpoint datasources
    if (newDatasource.package?.name !== 'endpoint') {
      return newDatasource;
    }

    const manifestState = await manifestManager.refresh({ initialize: true });

    // We cast the type here so that any changes to the Endpoint specific data
    // follow the types/schema expected
    let updatedDatasource = newDatasource as NewPolicyData;
    // updatedDatasource['artifact_manifest'] = manifestManager.
    // console.log(JSON.stringify(updatedDatasource.inputs[0].config));

    // Until we get the Default Policy Configuration in the Endpoint package,
    // we will add it here manually at creation time.
    // @ts-ignore
    if (newDatasource.inputs.length === 0) {
      updatedDatasource = {
        ...newDatasource,
        artifact_manifest: manifestState.manifest.toEndpointFormat(),
        inputs: [
          {
            type: 'endpoint',
            enabled: true,
            streams: [],
            config: {
              policy: {
                value: policyConfigFactory(),
              },
            },
          },
        ],
      };
    }

    // console.log(updatedDatasource);

    try {
      return updatedDatasource;
    } finally {
      await manifestManager.commit(manifestState);
    }
  };

  return handleDatasourceCreate;
};
