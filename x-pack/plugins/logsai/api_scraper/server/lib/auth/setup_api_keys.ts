/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest, RequestHandlerContext } from '@kbn/core/server';
import { apiScraperApiKeyType } from '../../saved_objects';
import { ApiScraperServer } from '../../types';
import {
  checkIfAPIKeysAreEnabled,
  checkIfEntityDiscoveryAPIKeyIsValid,
  generateApiScraperAPIKey,
} from './api_key/api_key';
import {
  deleteApiScraperAPIKey,
  readApiScraperAPIKey,
  saveApiScraperAPIKey,
} from './api_key/saved_object';
import { canEnableApiScraper } from './privileges';
import { ApiScraperAPIKeyServiceDisabled } from '../api/errors/api_scraper_api_key_service_disabled';
import { ApiScraperPermissionDenied } from '../api/errors/api_scraper_permission_denied';

export async function setupApiKeys(
  context: RequestHandlerContext,
  request: KibanaRequest,
  server: ApiScraperServer,
  definitionId: string,
  apiKeyId: string
) {
  const apiKeysEnabled = await checkIfAPIKeysAreEnabled(server);
  if (!apiKeysEnabled) {
    throw new ApiScraperAPIKeyServiceDisabled(
      'API key service is not enabled; try configuring `xpack.security.authc.api_key.enabled` in your elasticsearch config'
    );
  }
  const esClient = (await context.core).elasticsearch.client.asCurrentUser;
  const canEnable = await canEnableApiScraper(esClient, definitionId);
  if (!canEnable) {
    throw new ApiScraperPermissionDenied(
      'Current Kibana user does not have the required permissions to enable entity discovery'
    );
  }

  const soClient = (await context.core).savedObjects.getClient({
    includedHiddenTypes: [apiScraperApiKeyType.name],
  });
  const existingApiKey = await readApiScraperAPIKey(server, apiKeyId);

  if (existingApiKey !== undefined) {
    const isValid = await checkIfEntityDiscoveryAPIKeyIsValid(server, existingApiKey, definitionId);

    if (!isValid) {
      await deleteApiScraperAPIKey(soClient, apiKeyId);
      await server.security.authc.apiKeys.invalidateAsInternalUser({
        ids: [existingApiKey.id],
      });
    }
  }

  const apiKey = await generateApiScraperAPIKey(server, request, definitionId);
  if (apiKey === undefined) {
    throw new Error('could not generate entity discovery API key');
  }

  await saveApiScraperAPIKey(soClient, apiKey, apiKeyId);
}
