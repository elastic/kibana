/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { KbnClient } from '@kbn/test';
import pRetry from 'p-retry';
import { kibanaPackageJson } from '@kbn/repo-info';
import { STARTED_TRANSFORM_STATES } from '../../../../../common/constants';
import {
  ENDPOINT_ALERTS_INDEX,
  ENDPOINT_EVENTS_INDEX,
} from '../../../../../scripts/endpoint/common/constants';
import {
  METADATA_DATASTREAM,
  METADATA_UNITED_INDEX,
  METADATA_UNITED_TRANSFORM,
  metadataCurrentIndexPattern,
  metadataTransformPrefix,
  POLICY_RESPONSE_INDEX,
} from '../../../../../common/endpoint/constants';
import { EndpointDocGenerator } from '../../../../../common/endpoint/generate_data';
import type { GetCustomEndpointMetadataGeneratorOptions } from '../../../../../common/endpoint/data_generators/endpoint_metadata_generator';
import { EndpointMetadataGenerator } from '../../../../../common/endpoint/data_generators/endpoint_metadata_generator';
import { indexHostsAndAlerts } from '../../../../../common/endpoint/index_data';
import type { IndexedHostsAndAlertsResponse } from '../../../../../common/endpoint/index_data';

export interface CyLoadEndpointDataOptions
  extends Pick<GetCustomEndpointMetadataGeneratorOptions, 'version' | 'os'> {
  numHosts: number;
  numHostDocs: number;
  alertsPerHost: number;
  enableFleetIntegration: boolean;
  generatorSeed: string;
  waitUntilTransformed: boolean;
  withResponseActions: boolean;
  numResponseActions?: number;
  isolation: boolean;
  bothIsolatedAndNormalEndpoints?: boolean;
}

/**
 * Cypress plugin for handling loading Endpoint data into ES
 * @param esClient
 * @param kbnClient
 * @param options
 */
export const cyLoadEndpointDataHandler = async (
  esClient: Client,
  kbnClient: KbnClient,
  options: Partial<CyLoadEndpointDataOptions> = {}
): Promise<IndexedHostsAndAlertsResponse> => {
  const {
    numHosts = 1,
    numHostDocs = 1,
    alertsPerHost = 1,
    enableFleetIntegration = true,
    generatorSeed = `cy.${Math.random()}`,
    waitUntilTransformed = true,
    version = kibanaPackageJson.version,
    os,
    withResponseActions,
    isolation,
    numResponseActions,
  } = options;

  const DocGenerator = EndpointDocGenerator.custom({
    CustomMetadataGenerator: EndpointMetadataGenerator.custom({ version, os, isolation }),
  });

  if (waitUntilTransformed) {
    // need this before indexing docs so that the united transform doesn't
    // create a checkpoint with a timestamp after the doc timestamps
    await stopTransform(esClient, metadataTransformPrefix);
    await stopTransform(esClient, METADATA_UNITED_TRANSFORM);
  }

  // load data into the system
  const indexedData = await indexHostsAndAlerts(
    esClient as Client,
    kbnClient,
    generatorSeed,
    numHosts,
    numHostDocs,
    METADATA_DATASTREAM,
    POLICY_RESPONSE_INDEX,
    ENDPOINT_EVENTS_INDEX,
    ENDPOINT_ALERTS_INDEX,
    alertsPerHost,
    enableFleetIntegration,
    undefined,
    DocGenerator,
    withResponseActions,
    numResponseActions
  );

  if (waitUntilTransformed) {
    await startTransform(esClient, metadataTransformPrefix);

    const metadataIds = Array.from(new Set(indexedData.hosts.map((host) => host.agent.id)));
    await waitForEndpoints(esClient, 'endpoint_index', metadataIds);

    await startTransform(esClient, METADATA_UNITED_TRANSFORM);

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const agentIds = Array.from(new Set(indexedData.agents.map((agent) => agent.agent!.id)));
    await waitForEndpoints(esClient, 'united_index', agentIds);
  }

  return indexedData;
};

const stopTransform = async (esClient: Client, transformId: string): Promise<void> => {
  await esClient.transform.stopTransform({
    transform_id: `${transformId}*`,
    force: true,
    wait_for_completion: true,
    allow_no_match: true,
  });
};

const startTransform = async (esClient: Client, transformId: string): Promise<void> => {
  const transformsResponse = await esClient.transform.getTransformStats({
    transform_id: `${transformId}*`,
  });

  await Promise.all(
    transformsResponse.transforms.map((transform) => {
      if (STARTED_TRANSFORM_STATES.has(transform.state)) {
        return Promise.resolve();
      }

      return esClient.transform.startTransform({ transform_id: transform.id });
    })
  );
};

/**
 * Waits for data to show up on the Transform destination index of either the Endpoint metadata or
 * the united metadata index
 *
 * @param esClient
 * @param location
 * @param ids
 */
const waitForEndpoints = async (
  esClient: Client,
  location: 'endpoint_index' | 'united_index',
  ids: string[] = []
): Promise<void> => {
  const index = location === 'endpoint_index' ? metadataCurrentIndexPattern : METADATA_UNITED_INDEX;
  const body = ids.length
    ? location === 'endpoint_index'
      ? {
          query: {
            bool: {
              filter: [
                {
                  terms: {
                    'agent.id': ids,
                  },
                },
              ],
            },
          },
        }
      : {
          query: {
            bool: {
              filter: [
                {
                  terms: {
                    'agent.id': ids,
                  },
                },
                // make sure that both endpoint and agent portions are populated
                // since agent is likely to be populated first
                { exists: { field: 'united.endpoint.agent.id' } },
                { exists: { field: 'united.agent.agent.id' } },
              ],
            },
          },
        }
    : {
        size: 1,
        query: {
          match_all: {},
        },
      };

  const expectedSize = ids.length || 1;

  await pRetry(
    async () => {
      const response = await esClient.search({
        index,
        size: expectedSize,
        body,
        rest_total_hits_as_int: true,
      });

      // If not the expected number of Endpoints, then throw an error so we keep trying
      if (response.hits.total !== expectedSize) {
        throw new Error(
          `Expected number of endpoints not found. Looking for ${expectedSize} but received ${response.hits.total}`
        );
      }
    },
    { forever: false }
  );
};
