/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { UMRestApiRouteFactory } from '../types';
import { API_URLS } from '../../../common/constants';
import { pushConfigs } from '../../lib/synthetics_service/push_configs';
import { generateAPIKey } from './generate_service_api_key';
import { SyntheticsServiceApiKey } from '../../../common/runtime_types';
import { savedObjectsAdapter, syntheticsServiceApiKey } from '../../lib/saved_objects';

export const createSyncSyntheticsConfig: UMRestApiRouteFactory = () => ({
  method: 'GET',
  path: API_URLS.SYNC_CONFIG,
  validate: {},
  handler: async ({ savedObjectsClient, server, request, context }): Promise<any> => {
    const apiKey = await fetchAPIKey({
      request,
      savedObjects: context.core.savedObjects,
      security: server.security,
    });

    const settings = await savedObjectsAdapter.getUptimeDynamicSettings(savedObjectsClient);

    await pushConfigs({
      savedObjectsClient,
      config: server.config,
      cloud: server.cloud,
      apiKey,
      settings,
    });
  },
});
export const fetchAPIKey = async ({ savedObjects, security, request }: any) => {
  let apiKey: SyntheticsServiceApiKey;
  try {
    const hiddenSavedObjectClient = savedObjects.getClient({
      includedHiddenTypes: [syntheticsServiceApiKey.name],
    });
    // get api key
    apiKey = await savedObjectsAdapter.getSyntheticsServiceApiKey(hiddenSavedObjectClient!);
    // if no api key, set api key
    if (!apiKey) {
      apiKey = await generateAPIKey({
        request,
        security,
        savedObjectsClient: hiddenSavedObjectClient,
      });
    }
  } catch (e) {
    throw e;
  }
  return apiKey;
};
