/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RequestHandlerContext } from '@kbn/core/server';
import { SetupRouteOptions } from '../types';
import { ENTITY_INTERNAL_API_PREFIX } from '../../../common/constants_entities';
import { readEntityDiscoveryAPIKey, deleteEntityDiscoveryAPIKey } from '../../lib/auth';

export function disableEntityDiscoveryKeyRoute<T extends RequestHandlerContext>({
  router,
  server,
}: SetupRouteOptions<T>) {
  router.delete(
    {
      path: `${ENTITY_INTERNAL_API_PREFIX}/managed/enablement`,
      validate: false,
    },
    async (context, req, res) => {
      try {
        server.logger.debug('reading entity discovery API key from saved object');
        const apiKey = await readEntityDiscoveryAPIKey(server);

        if (apiKey !== undefined) {
          server.logger.debug(
            'existing entity discovery API key found; deleting and invalidating it'
          );

          await deleteEntityDiscoveryAPIKey((await context.core).savedObjects.client);
          await server.security.authc.apiKeys.invalidateAsInternalUser({
            ids: [apiKey.id],
          });
        }

        return res.ok();
      } catch (err) {
        server.logger.error(err);
        return res.customError({ statusCode: 500, body: err });
      }
    }
  );
}
