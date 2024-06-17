/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RequestHandlerContext } from '@kbn/core/server';
import { readEntityDiscoveryAPIKey, checkIfEntityDiscoveryAPIKeyIsValid } from '../../lib/auth';
import { SetupRouteOptions } from '../types';
import { ENTITY_INTERNAL_API_PREFIX } from '../../../common/constants_entities';
import { ERROR_API_KEY_NOT_FOUND, ERROR_API_KEY_NOT_VALID } from '../../../common/errors';

export function checkEntityDiscoveryKeyRoute<T extends RequestHandlerContext>({
  router,
  server,
}: SetupRouteOptions<T>) {
  router.get<unknown, unknown, unknown>(
    {
      path: `${ENTITY_INTERNAL_API_PREFIX}/managed/enablement`,
      validate: false,
    },
    async (context, req, res) => {
      try {
        server.logger.debug('reading entity discovery API key from saved object');
        const apiKey = await readEntityDiscoveryAPIKey(server);

        if (apiKey === undefined) {
          return res.ok({ body: { enabled: false, reason: ERROR_API_KEY_NOT_FOUND } });
        }

        server.logger.debug('validating existing entity discovery API key');
        const isValid = await checkIfEntityDiscoveryAPIKeyIsValid(server, apiKey);

        if (!isValid) {
          return res.ok({ body: { enabled: false, reason: ERROR_API_KEY_NOT_VALID } });
        }

        return res.ok({ body: { enabled: true } });
      } catch (err) {
        server.logger.error(err);
        return res.customError({ statusCode: 500, body: err });
      }
    }
  );
}
