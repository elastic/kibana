/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RequestHandlerContext } from '@kbn/core/server';
import { SetupRouteOptions } from '../types';
import { checkIfEntityDiscoveryAPIKeyIsValid, readEntityDiscoveryAPIKey } from '../../lib/auth';
import {
  ERROR_API_KEY_NOT_FOUND,
  ERROR_API_KEY_NOT_VALID,
  ERROR_DEFINITION_STOPPED,
  ERROR_PARTIAL_BUILTIN_INSTALLATION,
} from '../../../common/errors';
import { findEntityDefinitions } from '../../lib/entities/find_entity_definition';
import { builtInDefinitions } from '../../lib/entities/built_in';
import { getClientsFromAPIKey } from '../../lib/utils';

export function checkEntityDiscoveryEnabledRoute<T extends RequestHandlerContext>({
  router,
  server,
  logger,
}: SetupRouteOptions<T>) {
  router.get<unknown, unknown, unknown>(
    {
      path: '/internal/entities/managed/enablement',
      validate: false,
    },
    async (context, req, res) => {
      try {
        logger.debug('reading entity discovery API key from saved object');
        const apiKey = await readEntityDiscoveryAPIKey(server);

        if (apiKey === undefined) {
          return res.ok({ body: { enabled: false, reason: ERROR_API_KEY_NOT_FOUND } });
        }

        logger.debug('validating existing entity discovery API key');
        const isValid = await checkIfEntityDiscoveryAPIKeyIsValid(server, apiKey);

        if (!isValid) {
          return res.ok({ body: { enabled: false, reason: ERROR_API_KEY_NOT_VALID } });
        }

        const { esClient, soClient } = getClientsFromAPIKey({ apiKey, server });

        const entityDiscoveryState = await Promise.all(
          builtInDefinitions.map(async (builtInDefinition) => {
            const definitions = await findEntityDefinitions({
              esClient,
              soClient,
              id: builtInDefinition.id,
            });

            return definitions[0];
          })
        ).then((results) =>
          results.reduce(
            (state, definition) => {
              return {
                installed: Boolean(state.installed && definition?.state.installed),
                running: Boolean(state.running && definition?.state.running),
              };
            },
            { installed: true, running: true }
          )
        );

        if (!entityDiscoveryState.installed) {
          return res.ok({ body: { enabled: false, reason: ERROR_PARTIAL_BUILTIN_INSTALLATION } });
        }

        if (!entityDiscoveryState.running) {
          return res.ok({ body: { enabled: false, reason: ERROR_DEFINITION_STOPPED } });
        }

        return res.ok({ body: { enabled: true } });
      } catch (err) {
        logger.error(err);
        return res.customError({ statusCode: 500, body: err });
      }
    }
  );
}
