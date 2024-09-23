/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest, RequestHandlerContext } from '@kbn/core/server';
import { EntityDiscoveryApiKeyType } from '../../saved_objects';
import { EntityManagerServerSetup } from '../../types';
import {
  checkIfAPIKeysAreEnabled,
  checkIfEntityDiscoveryAPIKeyIsValid,
  generateEntityDiscoveryAPIKey,
} from './api_key/api_key';
import {
  deleteEntityDiscoveryAPIKey,
  readEntityDiscoveryAPIKey,
  saveEntityDiscoveryAPIKey,
} from './api_key/saved_object';
import { canEnableEntityDiscovery } from './privileges';
import { EntityAPIKeyServiceDisabled } from '../entities/errors/entity_api_key_service_disabled';
import { EntityPermissionDenied } from '../entities/errors/entity_permission_denied';

export async function setupApiKeys(
  context: RequestHandlerContext,
  request: KibanaRequest,
  server: EntityManagerServerSetup,
  definitionId: string,
  apiKeyId: string
) {
  const apiKeysEnabled = await checkIfAPIKeysAreEnabled(server);
  if (!apiKeysEnabled) {
    throw new EntityAPIKeyServiceDisabled(
      'API key service is not enabled; try configuring `xpack.security.authc.api_key.enabled` in your elasticsearch config'
    );
  }
  const esClient = (await context.core).elasticsearch.client.asCurrentUser;
  const canEnable = await canEnableEntityDiscovery(esClient);
  if (!canEnable) {
    throw new EntityPermissionDenied(
      'Current Kibana user does not have the required permissions to enable entity discovery'
    );
  }

  const soClient = (await context.core).savedObjects.getClient({
    includedHiddenTypes: [EntityDiscoveryApiKeyType.name],
  });
  const existingApiKey = await readEntityDiscoveryAPIKey(server, apiKeyId);

  if (existingApiKey !== undefined) {
    const isValid = await checkIfEntityDiscoveryAPIKeyIsValid(server, existingApiKey);

    if (!isValid) {
      await deleteEntityDiscoveryAPIKey(soClient, apiKeyId);
      await server.security.authc.apiKeys.invalidateAsInternalUser({
        ids: [existingApiKey.id],
      });
    }
  }

  const apiKey = await generateEntityDiscoveryAPIKey(server, request, definitionId);
  if (apiKey === undefined) {
    throw new Error('could not generate entity discovery API key');
  }

  await saveEntityDiscoveryAPIKey(soClient, apiKey, apiKeyId);
}
