/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RequestHandlerContext } from '@kbn/core/server';
import { getFakeKibanaRequest } from '@kbn/security-plugin/server/authentication/api_keys/fake_kibana_request';
import { readEntityDiscoveryAPIKey, checkIfEntityDiscoveryAPIKeyIsValid } from '../../lib/auth';
import { builtInDefinitions } from '../../lib/entities/built_in';
import { SetupRouteOptions } from '../types';
import { ENTITY_INTERNAL_API_PREFIX } from '../../../common/constants_entities';
import { ERROR_API_KEY_NOT_FOUND, ERROR_API_KEY_NOT_VALID } from '../../../common/errors';
import { installBuiltInEntityDefinitions } from '../../lib/entities/install_entity_definition';

export function installBuiltinEntityDefinitionsRoute<T extends RequestHandlerContext>({
  router,
  server,
  logger,
}: SetupRouteOptions<T>) {
  router.post(
    {
      path: `${ENTITY_INTERNAL_API_PREFIX}/managed/start`,
      validate: false,
    },
    async (context, req, res) => {
      try {
        logger.debug('reading entity discovery API key from saved object');
        const apiKey = await readEntityDiscoveryAPIKey(server);

        if (apiKey === undefined) {
          return res.ok({ body: { success: false, reason: ERROR_API_KEY_NOT_FOUND } });
        }

        logger.debug('validating existing entity discovery API key');
        const isValid = await checkIfEntityDiscoveryAPIKeyIsValid(server, apiKey);

        if (!isValid) {
          return res.ok({ body: { success: false, reason: ERROR_API_KEY_NOT_VALID } });
        }

        const fakeRequest = getFakeKibanaRequest({ id: apiKey.id, api_key: apiKey.apiKey });
        const soClient = server.core.savedObjects.getScopedClient(fakeRequest);
        const esClient = server.core.elasticsearch.client.asScoped(fakeRequest).asCurrentUser;

        logger.info(`Starting installation of builtin definitions`);
        const definitions = await installBuiltInEntityDefinitions({
          esClient,
          soClient,
          logger,
          builtInDefinitions,
          spaceId: 'default',
        });
        logger.info(`Builtin definitions are running`);

        return res.ok({ body: { success: true, definitions } });
      } catch (e) {
        logger.error(e);
        return res.customError({ body: e, statusCode: 500 });
      }
    }
  );
}
