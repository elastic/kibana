/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { getFakeKibanaRequest } from '@kbn/security-plugin/server/authentication/api_keys/fake_kibana_request';
import { EntityManagerServerSetup } from '../types';
import { EntityDiscoveryAPIKey } from './auth/api_key/api_key';

export const getClientsFromAPIKey = ({
  apiKey,
  server,
}: {
  apiKey: EntityDiscoveryAPIKey;
  server: EntityManagerServerSetup;
}): {
  esClient: ElasticsearchClient;
  soClient: SavedObjectsClientContract;
} => {
  const fakeRequest = getFakeKibanaRequest({ id: apiKey.id, api_key: apiKey.apiKey });
  const esClient = server.core.elasticsearch.client.asScoped(fakeRequest).asSecondaryAuthUser;
  const soClient = server.core.savedObjects.getScopedClient(fakeRequest);
  return { esClient, soClient };
};
