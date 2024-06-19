/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RequestHandlerContext } from '@kbn/core/server';
import { getFakeKibanaRequest } from '@kbn/security-plugin/server/authentication/api_keys/fake_kibana_request';
import { SetupRouteOptions } from '../types';
import { ENTITY_INTERNAL_API_PREFIX } from '../../../common/constants_entities';
import { ManagedEntityEnabledResponse } from '../../../common/types_api';
import { checkIfEntityDiscoveryAPIKeyIsValid, readEntityDiscoveryAPIKey } from '../../lib/auth';
import { ERROR_API_KEY_NOT_FOUND, ERROR_API_KEY_NOT_VALID } from '../../../common/errors';
import { findEntityDefinitions } from '../../lib/entities/find_entity_definition';
import { builtInDefinitions } from '../../lib/entities/built_in';

export function checkEntityDiscoveryEnabledRoute<T extends RequestHandlerContext>({
  router,
  server,
}: SetupRouteOptions<T>) {
  router.get<unknown, unknown, ManagedEntityEnabledResponse>(
    {
      path: `${ENTITY_INTERNAL_API_PREFIX}/managed/enablement`,
      validate: false,
    },
    async (context, req, res) => {
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

      const fakeRequest = getFakeKibanaRequest({ id: apiKey.id, api_key: apiKey.apiKey });
      const soClient = server.core.savedObjects.getScopedClient(fakeRequest);
      const esClient = server.core.elasticsearch.client.asScoped(fakeRequest).asCurrentUser;

      const entityDiscoveryEnabled = await Promise.all(
        builtInDefinitions.map(async (builtInDefinition) => {
          const [definition] = await findEntityDefinitions({
            esClient,
            soClient,
            id: builtInDefinition.id,
          });

          return definition && definition.state.installed && definition.state.running;
        })
      ).then((results) => results.every(Boolean));

      return res.ok({ body: { enabled: entityDiscoveryEnabled } });
    }
  );
}
