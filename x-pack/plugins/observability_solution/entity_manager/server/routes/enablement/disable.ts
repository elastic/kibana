/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RequestHandlerContext } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { SetupRouteOptions } from '../types';
import { deleteEntityDiscoveryAPIKey, readEntityDiscoveryAPIKey } from '../../lib/auth';
import { uninstallBuiltInEntityDefinitions } from '../../lib/entities/uninstall_entity_definition';
import { canDisableEntityDiscovery } from '../../lib/auth/privileges';
import { EntityDiscoveryApiKeyType } from '../../saved_objects';

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
 *       403:
 *         description: The current user does not have the required permissions to disable entity discovery
 *       200:
 *         description: Built-in entity discovery successfully disabled
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                  type: boolean
 */
export function disableEntityDiscoveryRoute<T extends RequestHandlerContext>({
  router,
  server,
  logger,
}: SetupRouteOptions<T>) {
  router.delete<unknown, { deleteData?: boolean }, unknown>(
    {
      path: '/internal/entities/managed/enablement',
      validate: {
        query: schema.object({
          deleteData: schema.maybe(schema.boolean({ defaultValue: false })),
        }),
      },
    },
    async (context, req, res) => {
      try {
        const esClient = (await context.core).elasticsearch.client.asCurrentUser;
        const canDisable = await canDisableEntityDiscovery(esClient);
        if (!canDisable) {
          return res.forbidden({
            body: {
              message:
                'Current Kibana user does not have the required permissions to disable entity discovery',
            },
          });
        }

        const soClient = (await context.core).savedObjects.getClient({
          includedHiddenTypes: [EntityDiscoveryApiKeyType.name],
        });

        await uninstallBuiltInEntityDefinitions({
          soClient,
          esClient,
          logger,
          deleteData: req.query.deleteData,
        });

        server.logger.debug('reading entity discovery API key from saved object');
        const apiKey = await readEntityDiscoveryAPIKey(server);
        // api key could be deleted outside of the apis, it does not affect the
        // disablement flow
        if (apiKey) {
          await deleteEntityDiscoveryAPIKey(soClient);
          await server.security.authc.apiKeys.invalidateAsInternalUser({
            ids: [apiKey.id],
          });
        }

        return res.ok({ body: { success: true } });
      } catch (err) {
        logger.error(err);
        return res.customError({ statusCode: 500, body: err });
      }
    }
  );
}
