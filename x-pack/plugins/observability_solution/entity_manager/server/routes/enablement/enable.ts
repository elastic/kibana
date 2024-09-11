/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createEntityDefinitionQuerySchema } from '@kbn/entities-schema';
import { z } from '@kbn/zod';
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
import { createEntityManagerServerRoute } from '../create_entity_manager_server_route';
import { UnexpectedEntityManagerError } from '../../lib/errors';

import { startTransforms } from '../../lib/entities/start_transforms';

/**
 * @openapi
 * /internal/entities/managed_definitions/_enable:
 *   post:
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
 *       422:
 *         description: API key service is not enabled, the request cannot proceed
 */
export const enableEntityDiscoveryRoute = createEntityManagerServerRoute({
  endpoint: 'POST /internal/entities/managed_definitions/_enable',
  params: z.object({
    query: createEntityDefinitionQuerySchema,
  }),
  handler: async ({ context, request, response, params, server, logger }) => {
    try {
      const apiKeysEnabled = await checkIfAPIKeysAreEnabled(server);
      if (!apiKeysEnabled) {
        return response.unprocessableContent({
          body: {
            message:
              'API key service is not enabled; verify the value of `xpack.security.authc.api_key.enabled` in your Elasticsearch config',
          },
        });
      }

      const esClient = (await context.core).elasticsearch.client.asCurrentUser;
      const canEnable = await canEnableEntityDiscovery(esClient);
      if (!canEnable) {
        return response.forbidden({
          body: {
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

      const apiKey = await generateEntityDiscoveryAPIKey(server, request);

      await saveEntityDiscoveryAPIKey(soClient, apiKey);

      const installedDefinitions = await installBuiltInEntityDefinitions({
        esClient,
        soClient,
        logger,
        definitions: builtInDefinitions,
      });

      if (!params.query.installOnly) {
        await Promise.all(
          installedDefinitions.map((installedDefinition) =>
            startTransforms(esClient, installedDefinition, logger)
          )
        );
      }

      return response.ok({ body: { success: true } });
    } catch (err) {
      logger.error(err);
      return response.customError({ statusCode: 500, body: new UnexpectedEntityManagerError(err) });
    }
  },
});
