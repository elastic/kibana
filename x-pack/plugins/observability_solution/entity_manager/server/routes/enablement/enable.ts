/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RequestHandlerContext } from '@kbn/core/server';
import { getFakeKibanaRequest } from '@kbn/security-plugin/server/authentication/api_keys/fake_kibana_request';
import { SetupRouteOptions } from '../types';
import { ENTITY_INTERNAL_API_PREFIX } from '../../../common/constants_entities';
import { EnableManagedEntityResponse } from '../../../common/types_api';
import {
  canEnableEntityDiscovery,
  checkIfAPIKeysAreEnabled,
  checkIfEntityDiscoveryAPIKeyIsValid,
  deleteEntityDiscoveryAPIKey,
  generateEntityDiscoveryAPIKey,
  readEntityDiscoveryAPIKey,
  saveEntityDiscoveryAPIKey,
} from '../../lib/auth';
import { builtInDefinitions } from '../../lib/entities/built_in';
import { installBuiltInEntityDefinitions } from '../../lib/entities/install_entity_definition';
import { EntityDiscoveryApiKeyType } from '../../saved_objects';
import { ERROR_API_KEY_SERVICE_DISABLED, ERROR_USER_NOT_AUTHORIZED } from '../../../common/errors';

export function enableEntityDiscoveryRoute<T extends RequestHandlerContext>({
  router,
  server,
  logger,
}: SetupRouteOptions<T>) {
  router.put<unknown, unknown, EnableManagedEntityResponse>(
    {
      path: `${ENTITY_INTERNAL_API_PREFIX}/managed/enablement`,
      validate: false,
    },
    async (context, req, res) => {
      const apiKeysEnabled = await checkIfAPIKeysAreEnabled(server);
      if (!apiKeysEnabled) {
        return res.ok({
          body: {
            success: false,
            reason: ERROR_API_KEY_SERVICE_DISABLED,
            message:
              'API key service is not enabled; try configuring `xpack.security.authc.api_key.enabled` in your elasticsearch config',
          },
        });
      }

      const esClient = (await context.core).elasticsearch.client.asCurrentUser;
      const canEnable = await canEnableEntityDiscovery(esClient);
      if (!canEnable) {
        return res.ok({
          body: {
            success: false,
            reason: ERROR_USER_NOT_AUTHORIZED,
            message:
              'Current Kibana user does not have the required permissions to enable entity discovery',
          },
        });
      }

      const soClient = (await context.core).savedObjects.getClient({
        includedHiddenTypes: [EntityDiscoveryApiKeyType.name],
      });

      const existingApiKey = await readEntityDiscoveryAPIKey(server);

      if (existingApiKey !== undefined) {
        const isValid = await checkIfEntityDiscoveryAPIKeyIsValid(server, existingApiKey);

        if (!isValid) {
          await deleteEntityDiscoveryAPIKey(soClient);
          await server.security.authc.apiKeys.invalidateAsInternalUser({
            ids: [existingApiKey.id],
          });
        }
      }

      const apiKey = await generateEntityDiscoveryAPIKey(server, req);

      if (apiKey === undefined) {
        throw new Error('could not generate entity discovery API key');
      }

      await saveEntityDiscoveryAPIKey(soClient, apiKey);

      const fakeRequest = getFakeKibanaRequest({ id: apiKey.id, api_key: apiKey.apiKey });
      const scopedSoClient = server.core.savedObjects.getScopedClient(fakeRequest);
      const scopedEsClient = server.core.elasticsearch.client.asScoped(fakeRequest).asCurrentUser;

      await installBuiltInEntityDefinitions({
        logger,
        builtInDefinitions,
        spaceId: 'default',
        esClient: scopedEsClient,
        soClient: scopedSoClient,
      });

      return res.ok({ body: { success: true } });
    }
  );
}
