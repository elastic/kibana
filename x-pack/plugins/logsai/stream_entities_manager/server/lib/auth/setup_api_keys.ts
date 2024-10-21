/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest, RequestHandlerContext } from '@kbn/core/server';
import { ApiKeySavedObject } from '../../saved_objects';
import { StreamEntitiesManagerServer } from '../../types';
import {
  checkIfAPIKeysAreEnabled,
  checkIfEntityDiscoveryAPIKeyIsValid,
  generateStreamEntitiesManagerAPIKey,
} from './api_key/api_key';
import {
  deleteStreamEntitiesManagerAPIKey,
  readStreamEntitiesManagerAPIKey,
  saveStreamEntitiesManagerAPIKey,
} from './api_key/saved_object';
import { canEnableStreamEntitiesManager } from './privileges';
import { APIKeyServiceDisabled, PermissionDenied } from '../api/errors';

export async function setupApiKeys(
  context: RequestHandlerContext,
  request: KibanaRequest,
  server: StreamEntitiesManagerServer,
  definitionId: string | string[],
  apiKeyId: string
) {
  const apiKeysEnabled = await checkIfAPIKeysAreEnabled(server);
  if (!apiKeysEnabled) {
    throw new APIKeyServiceDisabled(
      'API key service is not enabled; try configuring `xpack.security.authc.api_key.enabled` in your elasticsearch config'
    );
  }
  const esClient = (await context.core).elasticsearch.client.asCurrentUser;
  const canEnable = await canEnableStreamEntitiesManager(esClient, definitionId);
  if (!canEnable) {
    throw new PermissionDenied(
      'Current Kibana user does not have the required permissions to enable entity discovery'
    );
  }

  const soClient = (await context.core).savedObjects.getClient({
    includedHiddenTypes: [ApiKeySavedObject.name],
  });
  const existingApiKey = await readStreamEntitiesManagerAPIKey(server, apiKeyId);

  if (existingApiKey !== undefined) {
    const isValid = await checkIfEntityDiscoveryAPIKeyIsValid(server, existingApiKey, definitionId);

    if (!isValid) {
      await deleteStreamEntitiesManagerAPIKey(soClient, apiKeyId);
      await server.security.authc.apiKeys.invalidateAsInternalUser({
        ids: [existingApiKey.id],
      });
    }
  }

  const apiKey = await generateStreamEntitiesManagerAPIKey(server, request, definitionId);
  if (apiKey === undefined) {
    throw new Error('could not generate entity discovery API key');
  }

  return await saveStreamEntitiesManagerAPIKey(soClient, apiKey, apiKeyId);
}
