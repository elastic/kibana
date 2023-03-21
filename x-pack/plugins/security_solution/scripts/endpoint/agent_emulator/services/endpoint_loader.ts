/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file */

import type { Client } from '@elastic/elasticsearch';
import type { KbnClient } from '@kbn/test';
import pMap from 'p-map';
import type { CreatePackagePolicyResponse } from '@kbn/fleet-plugin/common';
import type { ToolingLog } from '@kbn/tooling-log';
import type seedrandom from 'seedrandom';
import { kibanaPackageJson } from '@kbn/repo-info';
import { indexAlerts } from '../../../../common/endpoint/data_loaders/index_alerts';
import { EndpointDocGenerator } from '../../../../common/endpoint/generate_data';
import { fetchEndpointMetadataList } from '../../common/endpoint_metadata_services';
import { indexEndpointHostDocs } from '../../../../common/endpoint/data_loaders/index_endpoint_hosts';
import { setupFleetForEndpoint } from '../../../../common/endpoint/data_loaders/setup_fleet_for_endpoint';
import { enableFleetServerIfNecessary } from '../../../../common/endpoint/data_loaders/index_fleet_server';
import { METADATA_DATASTREAM } from '../../../../common/endpoint/constants';
import { EndpointMetadataGenerator } from '../../../../common/endpoint/data_generators/endpoint_metadata_generator';
import { getEndpointPackageInfo } from '../../../../common/endpoint/index_data';
import { ENDPOINT_ALERTS_INDEX, ENDPOINT_EVENTS_INDEX } from '../../common/constants';

let WAS_FLEET_SETUP_DONE = false;

const CurrentKibanaVersionDocGenerator = class extends EndpointDocGenerator {
  constructor(seedValue: string | seedrandom.prng) {
    const MetadataGenerator = class extends EndpointMetadataGenerator {
      protected randomVersion(): string {
        return kibanaPackageJson.version;
      }
    };

    super(seedValue, MetadataGenerator);
  }
};

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

  return loadEndpoints({
    count: 2,
    esClient,
    kbnClient,
    log,
  });
};

interface LoadEndpointsProgress {
  percent: number;
  total: number;
  created: number;
}

interface LoadEndpointsOptions {
  esClient: Client;
  kbnClient: KbnClient;
  count?: number;
  log?: ToolingLog;
  onProgress?: (percentDone: LoadEndpointsProgress) => void;
  DocGeneratorClass?: typeof EndpointDocGenerator;
}

/**
 * Loads endpoints, including the corresponding fleet agent, into Kibana along with events and alerts
 *
 * @param count
 * @param esClient
 * @param kbnClient
 * @param log
 * @param onProgress
 * @param DocGeneratorClass
 */
export const loadEndpoints = async ({
  esClient,
  kbnClient,
  log,
  onProgress,
  count = 2,
  DocGeneratorClass = CurrentKibanaVersionDocGenerator,
}: LoadEndpointsOptions): Promise<void> => {
  if (log) {
    log.verbose(`loadEndpoints(): Loading ${count} endpoints...`);
  }

  if (!WAS_FLEET_SETUP_DONE) {
    await setupFleetForEndpoint(kbnClient);
    await enableFleetServerIfNecessary(esClient);
    // eslint-disable-next-line require-atomic-updates
    WAS_FLEET_SETUP_DONE = true;
  }

  const endpointPackage = await getEndpointPackageInfo(kbnClient);
  const realPolicies: Record<string, CreatePackagePolicyResponse['item']> = {};

  let progress: LoadEndpointsProgress = {
    total: count,
    created: 0,
    percent: 0,
  };

  const updateProgress = () => {
    const created = progress.created + 1;
    progress = {
      ...progress,
      created,
      percent: Math.ceil((created / count) * 100),
    };

    if (onProgress) {
      onProgress(progress);
    }
  };

  await pMap(
    Array.from({ length: count }),
    async () => {
      const endpointGenerator = new DocGeneratorClass();

      await indexEndpointHostDocs({
        numDocs: 1,
        client: esClient,
        kbnClient,
        realPolicies,
        epmEndpointPackage: endpointPackage,
        generator: endpointGenerator,
        enrollFleet: true,
        metadataIndex: METADATA_DATASTREAM,
        policyResponseIndex: 'metrics-endpoint.policy-default',
      });

      await indexAlerts({
        client: esClient,
        generator: endpointGenerator,
        eventIndex: ENDPOINT_EVENTS_INDEX,
        alertIndex: ENDPOINT_ALERTS_INDEX,
        numAlerts: 1,
        options: {
          ancestors: 3,
          generations: 3,
          children: 3,
          relatedEvents: 5,
          relatedAlerts: 5,
          percentWithRelated: 30,
          percentTerminated: 30,
          alwaysGenMaxChildrenPerNode: false,
          ancestryArraySize: 2,
          eventsDataStream: {
            type: 'logs',
            dataset: 'endpoint.events.process',
            namespace: 'default',
          },
          alertsDataStream: { type: 'logs', dataset: 'endpoint.alerts', namespace: 'default' },
        },
      });

      updateProgress();
    },
    {
      concurrency: 4,
    }
  );

  if (log) {
    log.verbose(`loadEndpoints(): ${count} endpoint(s) successfully loaded`);
  }
};
