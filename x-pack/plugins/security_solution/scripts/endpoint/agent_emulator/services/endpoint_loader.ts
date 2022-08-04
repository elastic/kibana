/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { KbnClient } from '@kbn/test';
import pMap from 'p-map';
import type { CreatePackagePolicyResponse } from '@kbn/fleet-plugin/common';
import type { ToolingLog } from '@kbn/tooling-log';
import { EndpointDocGenerator } from '../../../../common/endpoint/generate_data';
import { fetchEndpointMetadataList } from '../../common/endpoint_metadata_services';
import { indexEndpointHostDocs } from '../../../../common/endpoint/data_loaders/index_endpoint_hosts';
import { setupFleetForEndpoint } from '../../../../common/endpoint/data_loaders/setup_fleet_for_endpoint';
import { enableFleetServerIfNecessary } from '../../../../common/endpoint/data_loaders/index_fleet_server';
import { fetchEndpointPackageInfo } from '../../common/fleet_services';
import { METADATA_DATASTREAM } from '../../../../common/endpoint/constants';

let WAS_FLEET_SETUP_DONE = false;

export const loadEndpointsIfNoneExist = async (
  esClient: Client,
  kbnClient: KbnClient,
  log?: ToolingLog,
  count: number = 2
): Promise<void> => {
  if (!count || (await fetchEndpointMetadataList(kbnClient, { pageSize: 1 })).total > 0) {
    if (log) {
      log.verbose('loadEndpointsIfNoneExist(): Endpoints exist. Exiting (nothing was done)');
    }

    return;
  }

  return loadEndpoints(2, esClient, kbnClient, log);
};

interface LoadEndpointsProgress {
  percent: string;
  total: number;
  created: number;
}

export const loadEndpoints = async (
  count: number = 2,
  esClient: Client,
  kbnClient: KbnClient,
  log?: ToolingLog,
  onProgress?: (percentDone: LoadEndpointsProgress) => void
): Promise<void> => {
  // TODO: Support option for loading endpoints with alerts

  if (log) {
    log.verbose(`loadEndpoints(): Loading ${count} endpoints...`);
  }

  if (!WAS_FLEET_SETUP_DONE) {
    await setupFleetForEndpoint(kbnClient);
    await enableFleetServerIfNecessary(esClient);
    // eslint-disable-next-line require-atomic-updates
    WAS_FLEET_SETUP_DONE = true;
  }

  const endpointPackage = await fetchEndpointPackageInfo(kbnClient);
  const realPolicies: Record<string, CreatePackagePolicyResponse['item']> = {};

  let progress: LoadEndpointsProgress = {
    total: count,
    created: 0,
    percent: '0%',
  };

  const updateProgress = () => {
    const created = progress.created + 1;
    progress = {
      ...progress,
      created,
      percent: `${Math.ceil((created / count) * 100)}%`,
    };

    if (onProgress) {
      onProgress(progress);
    }
  };

  await pMap(
    Array.from({ length: count }),
    () => {
      const endpointGenerator = new EndpointDocGenerator();

      return indexEndpointHostDocs({
        numDocs: 1,
        client: esClient,
        kbnClient,
        realPolicies,
        epmEndpointPackage: endpointPackage,
        generator: endpointGenerator,
        enrollFleet: true,
        metadataIndex: METADATA_DATASTREAM,
        policyResponseIndex: 'metrics-endpoint.policy-default',
      }).then(updateProgress);
    },
    {
      concurrency: 10,
    }
  );

  if (log) {
    log.verbose(`loadEndpoints(): ${count} endpoint(s) successfully loaded`);
  }
};
