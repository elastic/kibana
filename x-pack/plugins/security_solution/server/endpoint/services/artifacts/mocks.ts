/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from 'src/core/server';
import { savedObjectsClientMock } from 'src/core/server/mocks';
import { ManifestClient } from './manifest_client';
import { EndpointArtifactClient, EndpointArtifactClientInterface } from './artifact_client';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ElasticsearchClientMock } from '../../../../../../../src/core/server/elasticsearch/client/mocks';
import { elasticsearchServiceMock } from '../../../../../../../src/core/server/mocks';
// Because mocks are for testing only, should be ok to import the FleetArtifactsClient directly
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { FleetArtifactsClient } from '../../../../../fleet/server/services';
import { createArtifactsClientMock } from '../../../../../fleet/server/mocks';

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
