/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RequestHandlerContext } from '@kbn/core/server';
import { SetupRouteOptions } from '../types';
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
import { ERROR_API_KEY_SERVICE_DISABLED, ERROR_USER_NOT_AUTHORIZED } from '../../../common/errors';
import { EntityDiscoveryApiKeyType } from '../../saved_objects';

export function enableEntityDiscoveryRoute<T extends RequestHandlerContext>({
  router,
  server,
  logger,
}: SetupRouteOptions<T>) {
  router.put<unknown, unknown, unknown>(
    {
      path: '/internal/entities/managed/enablement',
      validate: false,
    },
    async (context, req, res) => {
      try {
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
          return res.customError({
            statusCode: 500,
            body: new Error('could not generate entity discovery API key'),
          });
        }

        await saveEntityDiscoveryAPIKey(soClient, apiKey);

        await installBuiltInEntityDefinitions({
          logger,
          builtInDefinitions,
          esClient,
          soClient,
        });

        return res.ok({ body: { success: true } });
      } catch (err) {
        logger.error(err);
        return res.customError({ statusCode: 500, body: err });
      }
    }
  );
}
