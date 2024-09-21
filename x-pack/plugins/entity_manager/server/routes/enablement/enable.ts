/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createEntityDefinitionQuerySchema } from '@kbn/entities-schema';
import { z } from '@kbn/zod';
import { builtInDefinitions } from '../../lib/entities/built_in';
import { installBuiltInEntityDefinitions } from '../../lib/entities/install_entity_definition';

import { createEntityManagerServerRoute } from '../create_entity_manager_server_route';

import { startTransforms } from '../../lib/entities/start_transforms';
import { setupApiKeys } from '../../lib/auth/setup_api_keys';
import { ENTITY_DISCOVERY_API_KEY_SO_ID } from '../../lib/auth/api_key/saved_object';
import { EntityDiscoveryApiKeyType } from '../../saved_objects';

/**
 * @openapi
 * /internal/entities/managed/enablement:
 *   put:
 *     description: Enable managed (built-in) entity discovery.
 *     tags:
 *       - management
 *     parameters:
 *       - in: query
 *         name: installOnly
 *         description: If true, the definition transforms will not be started
 *         required: false
 *         schema:
 *           type: boolean
 *           default: false
 *     responses:
 *       200:
 *         description: OK - Verify result in response body
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: success
 *               properties:
 *                 success:
 *                  type: boolean
 *                  example: false
 *                 reason:
 *                  type: string
 *                  example: api_key_service_disabled
 *                 message:
 *                  type: string
 *                  example: API key service is not enabled; try configuring `xpack.security.authc.api_key.enabled` in your elasticsearch config
 *       403:
 *         description: The current user does not have the required permissions to enable entity discovery
 */
export const enableEntityDiscoveryRoute = createEntityManagerServerRoute({
  endpoint: 'PUT /internal/entities/managed/enablement',
  params: z.object({
    query: createEntityDefinitionQuerySchema,
  }),
  handler: async ({ context, request, response, params, server, logger, tasks }) => {
    try {
      // const apiKeysEnabled = await checkIfAPIKeysAreEnabled(server);
      // if (!apiKeysEnabled) {
      //   return response.ok({
      //     body: {
      //       success: false,
      //       reason: ERROR_API_KEY_SERVICE_DISABLED,
      //       message:
      //         'API key service is not enabled; try configuring `xpack.security.authc.api_key.enabled` in your elasticsearch config',
      //     },
      //   });
      // }

      const esClient = (await context.core).elasticsearch.client.asCurrentUser;
      // const canEnable = await canEnableEntityDiscovery(esClient);
      // if (!canEnable) {
      //   return response.forbidden({
      //     body: {
      //       message:
      //         'Current Kibana user does not have the required permissions to enable entity discovery',
      //     },
      //   });
      // }

      const soClient = (await context.core).savedObjects.getClient({
        includedHiddenTypes: [EntityDiscoveryApiKeyType.name],
      });
      // const existingApiKey = await readEntityDiscoveryAPIKey(server);

      // if (existingApiKey !== undefined) {
      //   const isValid = await checkIfEntityDiscoveryAPIKeyIsValid(server, existingApiKey);

      //   if (!isValid) {
      //     await deleteEntityDiscoveryAPIKey(soClient);
      //     await server.security.authc.apiKeys.invalidateAsInternalUser({
      //       ids: [existingApiKey.id],
      //     });
      //   }
      // }

      // const apiKey = await generateEntityDiscoveryAPIKey(server, request);
      // if (apiKey === undefined) {
      //   return response.customError({
      //     statusCode: 500,
      //     body: new Error('could not generate entity discovery API key'),
      //   });
      // }

      // await saveEntityDiscoveryAPIKey(soClient, apiKey);

      // TODO There is a bunch of crap we need to deal with reguards to when
      // the setupAPiKeys call fails and reverting everything that createEntityDefinition handles.
      // I'm defering this for now since this is just a prototype and we can
      // invest more later in this area.
      setupApiKeys(
        context,
        request,
        server,
        'built-in definitions',
        ENTITY_DISCOVERY_API_KEY_SO_ID
      );

      const installedDefinitions = await installBuiltInEntityDefinitions({
        esClient,
        soClient,
        logger,
        definitions: builtInDefinitions.map((def) => ({
          ...def,
          // we need to add the built-in apiKey for the task manager
          apiKeyId: ENTITY_DISCOVERY_API_KEY_SO_ID,
        })),
      });

      if (!params.query.installOnly) {
        await Promise.all(
          installedDefinitions.map(async (installedDefinition) => {
            await startTransforms(esClient, installedDefinition, logger);
            await tasks.entityMergeTask.start(installedDefinition, server);
          })
        );
      }

      return response.ok({ body: { success: true } });
    } catch (err) {
      logger.error(err);
      return response.customError({ statusCode: 500, body: err });
    }
  },
});
