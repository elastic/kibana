/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '@kbn/core/server';
import { savedObjectsClientMock, elasticsearchServiceMock } from '@kbn/core/server/mocks';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ElasticsearchClientMock } from '@kbn/core/server/elasticsearch/client/mocks';
// Because mocks are for testing only, should be ok to import the FleetArtifactsClient directly
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { FleetArtifactsClient } from '@kbn/fleet-plugin/server/services';
import { createArtifactsClientMock } from '@kbn/fleet-plugin/server/mocks';
import { EndpointArtifactClient, EndpointArtifactClientInterface } from './artifact_client';
import { ManifestClient } from './manifest_client';

export const getManifestClientMock = (
  savedObjectsClient?: SavedObjectsClientContract
): ManifestClient => {
  if (savedObjectsClient !== undefined) {
    return new ManifestClient(savedObjectsClient, 'v1');
  }
  return new ManifestClient(savedObjectsClientMock.create(), 'v1');
};

/**
 * Returns back a mocked EndpointArtifactClient along with the internal FleetArtifactsClient and the Es Clients that are being used
 * @param esClient
 */
export const createEndpointArtifactClientMock = (
  esClient: ElasticsearchClientMock = elasticsearchServiceMock.createScopedClusterClient()
    .asInternalUser
): jest.Mocked<EndpointArtifactClientInterface> & {
  _esClient: ElasticsearchClientMock;
} => {
  const fleetArtifactClientMocked = createArtifactsClientMock();
  const endpointArtifactClientMocked = new EndpointArtifactClient(fleetArtifactClientMocked);

  // Return the interface mocked with jest.fn() that fowards calls to the real instance
  return {
    createArtifact: jest.fn(async (...args) => {
      const fleetArtifactClient = new FleetArtifactsClient(esClient, 'endpoint');
      const endpointArtifactClient = new EndpointArtifactClient(fleetArtifactClient);
      const response = await endpointArtifactClient.createArtifact(...args);
      return response;
    }),
    listArtifacts: jest.fn((...args) => endpointArtifactClientMocked.listArtifacts(...args)),
    getArtifact: jest.fn((...args) => endpointArtifactClientMocked.getArtifact(...args)),
    deleteArtifact: jest.fn((...args) => endpointArtifactClientMocked.deleteArtifact(...args)),
    _esClient: esClient,
  };
};
