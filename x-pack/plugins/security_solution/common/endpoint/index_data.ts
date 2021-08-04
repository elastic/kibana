/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';
import seedrandom from 'seedrandom';
// eslint-disable-next-line import/no-extraneous-dependencies
import { KbnClient } from '@kbn/test';
import { AxiosResponse } from 'axios';
import { merge } from 'lodash';
import { ResponseError } from '@elastic/elasticsearch/lib/errors';
import { EndpointDocGenerator, TreeOptions } from './generate_data';
import {
  CreatePackagePolicyResponse,
  EPM_API_ROUTES,
  GetPackagesResponse,
} from '../../../fleet/common';
import { IndexedHostsResponse, indexEndpointHostDocs } from './data_loaders/index_endpoint_hosts';
import { enableFleetServerIfNecessary } from './data_loaders/fleet_utils';
import { indexAlerts } from './data_loaders/index_alerts';

export type IndexedHostsAndAlertsResponse = IndexedHostsResponse & {
  /**
   * Will delete the data that was loaded
   */
  deleteData: () => Promise<void>;
};

export async function indexHostsAndAlerts(
  client: Client,
  kbnClient: KbnClient,
  seed: string,
  numHosts: number,
  numDocs: number,
  metadataIndex: string,
  policyResponseIndex: string,
  eventIndex: string,
  alertIndex: string,
  alertsPerHost: number,
  fleet: boolean,
  options: TreeOptions = {}
): Promise<IndexedHostsAndAlertsResponse> {
  const random = seedrandom(seed);
  const epmEndpointPackage = await getEndpointPackageInfo(kbnClient);
  const response: IndexedHostsAndAlertsResponse = {
    hosts: [],
    policies: [],
    agents: [],

    async deleteData(): Promise<void> {
      await deleteIndices(client, [metadataIndex, policyResponseIndex, eventIndex, alertIndex]);

      // FIXME: should delete individual documents rather than the entire set of indexes (using esClient.bulk())
      // TODO: need to also delete data from Fleet indexes
    },
  };

  // If `fleet` integration is true, then ensure a (fake) fleet-server is connected
  if (fleet) {
    await enableFleetServerIfNecessary(client);
  }

  // Keep a map of host applied policy ids (fake) to real ingest package configs (policy record)
  const realPolicies: Record<string, CreatePackagePolicyResponse['item']> = {};

  for (let i = 0; i < numHosts; i++) {
    const generator = new EndpointDocGenerator(random);
    const indexedHosts = await indexEndpointHostDocs({
      numDocs,
      client,
      kbnClient,
      realPolicies,
      epmEndpointPackage,
      metadataIndex,
      policyResponseIndex,
      enrollFleet: fleet,
      generator,
    });

    merge(response, indexedHosts);

    await indexAlerts({
      client,
      eventIndex,
      alertIndex,
      generator,
      numAlerts: alertsPerHost,
      options,
    });
  }

  await client.indices.refresh({
    index: eventIndex,
  });

  // TODO: Unclear why the documents are not showing up after the call to refresh.
  // Waiting 5 seconds allows the indices to refresh automatically and
  // the documents become available in API/integration tests.
  await delay(5000);

  return response;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const getEndpointPackageInfo = async (
  kbnClient: KbnClient
): Promise<GetPackagesResponse['response'][0]> => {
  const endpointPackage = ((await kbnClient.request({
    path: `${EPM_API_ROUTES.LIST_PATTERN}?category=security`,
    method: 'GET',
  })) as AxiosResponse<GetPackagesResponse>).data.response.find(
    (epmPackage) => epmPackage.name === 'endpoint'
  );

  if (!endpointPackage) {
    throw new Error('EPM Endpoint package was not found!');
  }

  return endpointPackage;
};

// FIXME:PT remove this. too distructive. Need to delete individual items created instead.
// Temporary until individual item deletion is supported. this is the same code that is in the loader script when using the `--delete` option
const deleteIndices = async (esClient: Client, indices: string[]): Promise<void> => {
  for (const index of indices) {
    try {
      // The index could be a data stream so let's try deleting that first
      // The ES client in Kibana doesn't support data streams yet so we need to make a raw request to the ES route
      await esClient.transport.request({ method: 'DELETE', path: `_data_stream/${index}` });
    } catch (err) {
      // only throw if the error is NOT 404
      if (!(err instanceof ResponseError) || err.statusCode === 404) {
        const wrappedError: Error & { meta?: unknown } = new Error(err.message);
        wrappedError.meta = err;
        throw wrappedError;
      }
    }
  }
};
