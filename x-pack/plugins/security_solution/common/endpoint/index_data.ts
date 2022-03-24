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
import { EndpointDocGenerator, TreeOptions } from './generate_data';
import {
  CreatePackagePolicyResponse,
  EPM_API_ROUTES,
  GetPackagesResponse,
} from '../../../fleet/common';
import {
  deleteIndexedEndpointHosts,
  DeleteIndexedEndpointHostsResponse,
  IndexedHostsResponse,
  indexEndpointHostDocs,
} from './data_loaders/index_endpoint_hosts';
import { enableFleetServerIfNecessary } from './data_loaders/index_fleet_server';
import { indexAlerts } from './data_loaders/index_alerts';
import { setupFleetForEndpoint } from './data_loaders/setup_fleet_for_endpoint';

export type IndexedHostsAndAlertsResponse = IndexedHostsResponse;

/**
 * Indexes Endpoint Hosts (with optional Fleet counterparts) along with alerts
 *
 * @param client
 * @param kbnClient
 * @param seed
 * @param numHosts
 * @param numDocs
 * @param metadataIndex
 * @param policyResponseIndex
 * @param eventIndex
 * @param alertIndex
 * @param alertsPerHost
 * @param fleet
 * @param options
 */
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
    policyResponses: [],
    agents: [],
    fleetAgentsIndex: '',
    metadataIndex,
    policyResponseIndex,
    actionResponses: [],
    responsesIndex: '',
    actions: [],
    actionsIndex: '',
    endpointActions: [],
    endpointActionsIndex: '',
    endpointActionResponses: [],
    endpointActionResponsesIndex: '',
    integrationPolicies: [],
    agentPolicies: [],
  };

  // Ensure fleet is setup and endpoint package installed
  await setupFleetForEndpoint(kbnClient);

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

  return response;
}

const getEndpointPackageInfo = async (
  kbnClient: KbnClient
): Promise<GetPackagesResponse['items'][0]> => {
  const endpointPackage = (
    (await kbnClient.request({
      path: `${EPM_API_ROUTES.LIST_PATTERN}?category=security`,
      method: 'GET',
    })) as AxiosResponse<GetPackagesResponse>
  ).data.items.find((epmPackage) => epmPackage.name === 'endpoint');

  if (!endpointPackage) {
    throw new Error('EPM Endpoint package was not found!');
  }

  return endpointPackage;
};

export type DeleteIndexedHostsAndAlertsResponse = DeleteIndexedEndpointHostsResponse;

export const deleteIndexedHostsAndAlerts = async (
  esClient: Client,
  kbnClient: KbnClient,
  indexedData: IndexedHostsAndAlertsResponse
): Promise<DeleteIndexedHostsAndAlertsResponse> => {
  return {
    ...(await deleteIndexedEndpointHosts(esClient, kbnClient, indexedData)),
  };
};
