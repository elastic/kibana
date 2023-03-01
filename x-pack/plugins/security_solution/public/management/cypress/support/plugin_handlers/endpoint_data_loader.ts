/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file */

import type { Client } from '@elastic/elasticsearch';
import type { KbnClient } from '@kbn/test';
import type seedrandom from 'seedrandom';
import { kibanaPackageJson } from '@kbn/repo-info';
import { EndpointDocGenerator } from '../../../../../common/endpoint/generate_data';
import { EndpointMetadataGenerator } from '../../../../../common/endpoint/data_generators/endpoint_metadata_generator';
import { indexHostsAndAlerts } from '../../../../../common/endpoint/index_data';
import type { IndexedHostsAndAlertsResponse } from '../../../../../common/endpoint/index_data';

interface CyLoadEndpointDataOptions {
  numHosts: number;
  numHostDocs: number;
  alertsPerHost: number;
  enableFleetIntegration: boolean;
  generatorSeed: string;
  waitUntilTransformed: boolean;
  waitTimeout: number;
  customIndexFn: () => Promise<IndexedHostsAndAlertsResponse>;
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
    waitTimeout = 60000,
    customIndexFn,
  } = options;

  if (waitUntilTransformed) {
    // need this before indexing docs so that the united transform doesn't
    // create a checkpoint with a timestamp after the doc timestamps
    // FIXME:PT Implement stop transforms
    // await this.stopTransform(metadataTransformPrefix);
    // await this.stopTransform(METADATA_UNITED_TRANSFORM);
  }

  // load data into the system
  const indexedData = customIndexFn
    ? await customIndexFn()
    : await indexHostsAndAlerts(
        esClient as Client,
        kbnClient,
        generatorSeed,
        numHosts,
        numHostDocs,
        // FIXME:PT use const for indexes (where possible)
        'metrics-endpoint.metadata-default',
        'metrics-endpoint.policy-default',
        'logs-endpoint.events.process-default',
        'logs-endpoint.alerts-default',
        alertsPerHost,
        enableFleetIntegration,
        undefined,
        CurrentKibanaVersionDocGenerator
      );

  if (waitUntilTransformed) {
    // FIXME:PT implement start transform methods
    // await this.startTransform(metadataTransformPrefix);
    // const metadataIds = Array.from(new Set(indexedData.hosts.map((host) => host.agent.id)));
    // await this.waitForEndpoints(metadataIds, waitTimeout);
    // await this.startTransform(METADATA_UNITED_TRANSFORM);
    // const agentIds = Array.from(new Set(indexedData.agents.map((agent) => agent.agent!.id)));
    // await this.waitForUnitedEndpoints(agentIds, waitTimeout);
  }

  return indexedData;
};

// Document Generator override that uses a custom Endpoint Metadata generator and sets the
// `agent.version` to the current version
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
