/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createEntityDefinitionQuerySchema } from '@kbn/entities-schema';
import { z } from '@kbn/zod';
import { ERROR_API_KEY_SERVICE_DISABLED } from '../../../common/errors';
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

import { startTransforms } from '../../lib/entities/start_transforms';

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
  options: {
    security: {
      authz: {
        enabled: false,
        reason:
          'This endpoint leverages the security plugin to evaluate the privileges needed as part of its core flow',
      },
    },
  },
  params: z.object({
    query: createEntityDefinitionQuerySchema,
  }),
  handler: async ({ context, request, response, params, server, logger }) => {
    try {
      const apiKeysEnabled = await checkIfAPIKeysAreEnabled(server);
      if (!apiKeysEnabled) {
        return response.ok({
          body: {
            success: false,
            reason: ERROR_API_KEY_SERVICE_DISABLED,
            message:
              'API key service is not enabled; try configuring `xpack.security.authc.api_key.enabled` in your elasticsearch config',
          },
        });
      }

      const core = await context.core;

      const esClientAsCurrentUser = core.elasticsearch.client.asCurrentUser;
      const canEnable = await canEnableEntityDiscovery(esClientAsCurrentUser);
      if (!canEnable) {
        return response.forbidden({
          body: {
            message:
              'Current Kibana user does not have the required permissions to enable entity discovery',
          },
        });
      }

      logger.info(`Enabling managed entity discovery (installOnly=${params.query.installOnly})`);
      const soClient = core.savedObjects.getClient({
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
      if (apiKey === undefined) {
        return response.customError({
          statusCode: 500,
          body: new Error('could not generate entity discovery API key'),
        });
      }

      await saveEntityDiscoveryAPIKey(soClient, apiKey);

      const esClient = core.elasticsearch.client.asCurrentUser;
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
      logger.info('Managed entity discovery is enabled');

      return response.ok({ body: { success: true } });
    } catch (err) {
      logger.error(err);
      return response.customError({ statusCode: 500, body: err });
    }
  },
});
