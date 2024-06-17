/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RequestHandlerContext } from '@kbn/core/server';
import {
  readEntityDiscoveryAPIKey,
  saveEntityDiscoveryAPIKey,
  deleteEntityDiscoveryAPIKey,
  checkIfAPIKeysAreEnabled,
  canEnableEntityDiscovery,
  generateEntityDiscoveryAPIKey,
  checkIfEntityDiscoveryAPIKeyIsValid,
} from '../../lib/auth';
import { SetupRouteOptions } from '../types';
import { ENTITY_INTERNAL_API_PREFIX } from '../../../common/constants_entities';
import { ERROR_API_KEY_SERVICE_DISABLED, ERROR_USER_NOT_AUTHORIZED } from '../../../common/errors';
import { EntityDiscoveryApiKeyType } from '../../saved_objects';

export function enableEntityDiscoveryKeyRoute<T extends RequestHandlerContext>({
  router,
  server,
}: SetupRouteOptions<T>) {
  router.put(
    {
      path: `${ENTITY_INTERNAL_API_PREFIX}/managed/enablement`,
      validate: false,
    },
    async (context, req, res) => {
      try {
        server.logger.debug('checking if API key service is enabled');

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

        server.logger.debug(
          'checking if current Kibana user has permission to enable entity discovery'
        );

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

        server.logger.debug('reading entity discovery API key from saved object');

        const existingApiKey = await readEntityDiscoveryAPIKey(server);

        if (existingApiKey !== undefined) {
          server.logger.debug('validating existing entity discovery API key');

          const isValid = await checkIfEntityDiscoveryAPIKeyIsValid(server, existingApiKey);

          if (isValid) {
            return res.ok({
              body: {
                success: true,
                message: 'Valid entity discovery API key already exists',
              },
            });
          }

          server.logger.debug('existing entity discovery API key is invalid; deleting it');

          await deleteEntityDiscoveryAPIKey(soClient);
          await server.security.authc.apiKeys.invalidateAsInternalUser({
            ids: [existingApiKey.id],
          });
        }

        server.logger.debug('generating a fresh entity discovery API key');

        const apiKey = await generateEntityDiscoveryAPIKey(server, req);

        if (apiKey === undefined) {
          throw new Error('could not generate entity discovery API key');
        }

        server.logger.debug('saving entity discovery API key in encrypted saved object');
        await saveEntityDiscoveryAPIKey(soClient, apiKey);

        return res.ok({
          body: {
            success: true,
            message: 'New entity discovery API key generated',
          },
        });
      } catch (err) {
        server.logger.error(err);
        return res.customError({ statusCode: 500, body: err });
      }
    }
  );
}
