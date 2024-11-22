/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { BooleanFromString } from '@kbn/zod-helpers';
import { deleteEntityDiscoveryAPIKey, readEntityDiscoveryAPIKey } from '../../lib/auth';
import { canDisableEntityDiscovery } from '../../lib/auth/privileges';
import { uninstallBuiltInEntityDefinitions } from '../../lib/entities/uninstall_entity_definition';
import { EntityDiscoveryApiKeyType } from '../../saved_objects';
import { createEntityManagerServerRoute } from '../create_entity_manager_server_route';

/**
 * @openapi
 * /internal/entities/managed/enablement:
 *   delete:
 *     description: Disable managed (built-in) entity discovery. This stops and deletes the transforms, ingest pipelines, definitions saved objects, and index templates for this entity definition, as well as the stored API key for entity discovery management.
 *     tags:
 *       - management
 *     parameters:
 *       - in: query
 *         name: deleteData
 *         description: If true, delete all entity data in the managed indices
 *         required: false
 *         schema:
 *           type: boolean
 *           default: false
 *     responses:
 *       200:
 *         description: Built-in entity discovery successfully disabled
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: success
 *               properties:
 *                 success:
 *                  type: boolean
 *       403:
 *         description: The current user does not have the required permissions to disable entity discovery
 */
export const disableEntityDiscoveryRoute = createEntityManagerServerRoute({
  endpoint: 'DELETE /internal/entities/managed/enablement',
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
    query: z.object({
      deleteData: z.optional(BooleanFromString).default(false),
    }),
  }),
  handler: async ({ context, request, response, params, logger, server, getScopedClient }) => {
    try {
      const esClientAsCurrentUser = (await context.core).elasticsearch.client.asCurrentUser;
      const canDisable = await canDisableEntityDiscovery(esClientAsCurrentUser);
      if (!canDisable) {
        return response.forbidden({
          body: {
            message:
              'Current Kibana user does not have the required permissions to disable entity discovery',
          },
        });
      }

      const entityClient = await getScopedClient({ request });
      const soClient = (await context.core).savedObjects.getClient({
        includedHiddenTypes: [EntityDiscoveryApiKeyType.name],
      });

      logger.info('Disabling managed entity discovery');
      await uninstallBuiltInEntityDefinitions({
        entityClient,
        deleteData: params.query.deleteData,
      });

      logger.debug('reading entity discovery API key from saved object');
      const apiKey = await readEntityDiscoveryAPIKey(server);
      // api key could be deleted outside of the apis, it does not affect the
      // disablement flow
      if (apiKey) {
        await deleteEntityDiscoveryAPIKey(soClient);
        await server.security.authc.apiKeys.invalidateAsInternalUser({
          ids: [apiKey.id],
        });
      }
      logger.info('Managed entity discovery is disabled');

      return response.ok({ body: { success: true } });
    } catch (err) {
      logger.error(err);
      return response.customError({ statusCode: 500, body: err });
    }
  },
});
