/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { KibanaRequest, SavedObjectsClientContract } from 'kibana/server';
import { UMRestApiRouteFactory } from '../types';
import { savedObjectsAdapter } from '../../lib/saved_objects';
import { API_URLS } from '../../../common/constants';
import { SecurityPluginStart } from '../../../../security/server';

export const createGetAPIKeysRoute: UMRestApiRouteFactory = () => ({
  method: 'GET',
  path: API_URLS.API_KEYS,
  validate: {},
  handler: async ({ server, request, savedObjectsClient }): Promise<any> => {
    await generateAPIKey({ security: server.security, savedObjectsClient, request });
  },
});

export const generateAPIKey = async ({
  security,
  request,
  savedObjectsClient,
}: {
  security?: SecurityPluginStart;
  request: KibanaRequest;
  savedObjectsClient: SavedObjectsClientContract;
}) => {
  try {
    const isApiKeysEnabled = await security?.authc.apiKeys?.areAPIKeysEnabled();

    if (!isApiKeysEnabled) {
      return null;
    }

    const apiKey = await security?.authc.apiKeys?.grantAsInternalUser(request, {
      name: 'synthetics-api-key',
      role_descriptors: {
        synthetics_writer: {
          cluster: ['monitor', 'read_ilm', 'read_pipeline'],
          index: [
            {
              names: ['synthetics-*', 'heartbeat-*'],
              privileges: ['view_index_metadata', 'create_doc'],
            },
          ],
        },
      },
    });

    if (apiKey) {
      await savedObjectsAdapter.setSyntheticsServiceApiKey(savedObjectsClient, apiKey);
    }
    return apiKey;
  } catch (e) {
    throw e;
  }
};
