/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { getFakeKibanaRequest } from '@kbn/security-plugin/server/authentication/api_keys/fake_kibana_request';
import { DataViewsService } from '@kbn/data-views-plugin/common';
import { EntityManagerServerSetup } from '../types';
import { EntityDiscoveryAPIKey } from './auth/api_key/api_key';

export const getClientsFromAPIKey = async ({
  apiKey,
  server,
}: {
  apiKey: EntityDiscoveryAPIKey;
  server: EntityManagerServerSetup;
}): Promise<{
  esClient: ElasticsearchClient;
  soClient: SavedObjectsClientContract;
  dataViewsService: DataViewsService;
}> => {
  const fakeRequest = getFakeKibanaRequest({ id: apiKey.id, api_key: apiKey.apiKey });
  const esClient = server.core.elasticsearch.client.asScoped(fakeRequest).asSecondaryAuthUser;
  const soClient = server.core.savedObjects.getScopedClient(fakeRequest);

  const dataViewsService = await server.dataViews.dataViewsServiceFactory(
    soClient,
    esClient,
    fakeRequest
  );

  return { esClient, soClient, dataViewsService };
};
