/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import seedrandom from 'seedrandom';
import type { KbnClient } from '@kbn/test';
import type { CreatePackagePolicyResponse } from '@kbn/fleet-plugin/common';
import type { ToolingLog } from '@kbn/tooling-log';
import { usageTracker } from './data_loaders/usage_tracker';
import type { TreeOptions } from './generate_data';
import { EndpointDocGenerator } from './generate_data';
import type {
  DeleteIndexedEndpointHostsResponse,
  IndexedHostsResponse,
} from './data_loaders/index_endpoint_hosts';
import {
  deleteIndexedEndpointHosts,
  indexEndpointHostDocs,
} from './data_loaders/index_endpoint_hosts';
import { enableFleetServerIfNecessary } from './data_loaders/index_fleet_server';
import { indexAlerts } from './data_loaders/index_alerts';
import { setupFleetForEndpoint } from './data_loaders/setup_fleet_for_endpoint';
import { createToolingLogger, mergeAndAppendArrays } from './data_loaders/utils';
import {
  waitForMetadataTransformsReady,
  stopMetadataTransforms,
  startMetadataTransforms,
} from './utils/transforms';
import { getEndpointPackageInfo } from './utils/package';

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
 * @param DocGenerator
 * @param withResponseActions
 * @param numResponseActions
 * @param alertIds
 * @param logger_
 */
export const indexHostsAndAlerts = usageTracker.track(
  'indexHostsAndAlerts',
  async (
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
    options: TreeOptions = {},
    DocGenerator: typeof EndpointDocGenerator = EndpointDocGenerator,
    withResponseActions = true,
    numResponseActions?: number,
    alertIds?: string[],
    isServerless: boolean = false,
    logger_?: ToolingLog
  ): Promise<IndexedHostsAndAlertsResponse> => {
    const random = seedrandom(seed);
    const logger = logger_ ?? createToolingLogger();
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
    await setupFleetForEndpoint(kbnClient, logger);

    // If `fleet` integration is true, then ensure a (fake) fleet-server is connected
    if (fleet) {
      await enableFleetServerIfNecessary(client, isServerless, kbnClient, logger);
    }

    // Keep a map of host applied policy ids (fake) to real ingest package configs (policy record)
    const realPolicies: Record<string, CreatePackagePolicyResponse['item']> = {};

    const shouldWaitForEndpointMetadataDocs = fleet;
    if (shouldWaitForEndpointMetadataDocs) {
      await waitForMetadataTransformsReady(client, epmEndpointPackage.version);
      await stopMetadataTransforms(client, epmEndpointPackage.version);
    }

    for (let i = 0; i < numHosts; i++) {
      const generator = new DocGenerator(random);
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
        withResponseActions,
        numResponseActions,
        alertIds,
      });

      mergeAndAppendArrays(response, indexedHosts);

      await indexAlerts({
        client,
        eventIndex,
        alertIndex,
        generator,
        numAlerts: alertsPerHost,
        options,
      });
    }

    if (shouldWaitForEndpointMetadataDocs) {
      await startMetadataTransforms(
        client,
        response.agents.map((agent) => agent.agent?.id ?? ''),
        epmEndpointPackage.version
      );
    }

    return response;
  }
);

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
