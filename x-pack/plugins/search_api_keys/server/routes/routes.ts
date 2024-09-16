/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';

import { schema } from '@kbn/config-schema';
import { APIRoutes } from '../../common/types';
import { getAPIKeyById } from '../lib/get_key_by_id';
import { createAPIKey } from '../lib/create_key';
import { fetchClusterHasApiKeys, fetchUserStartPrivileges } from '../lib/privileges';

export function registerRoutes(router: IRouter, logger: Logger) {
  router.post(
    {
      path: APIRoutes.API_KEY_VALIDITY,
      validate: {
        body: schema.object({
          id: schema.string(),
        }),
      },
      options: {
        access: 'internal',
      },
    },
    async (context, request, response) => {
      try {
        const core = await context.core;
        const client = core.elasticsearch.client.asCurrentUser;
        const apiKey = await getAPIKeyById(request.body.id, client, logger);
        logger.info('API KEY' + JSON.stringify(apiKey));

        if (!apiKey) {
          return response.customError({
            body: { message: 'API key is not found.' },
            statusCode: 404,
          });
        }

        return response.ok({
          body: { isValid: !apiKey.invalidated },
          headers: { 'content-type': 'application/json' },
        });
      } catch (e) {
        logger.error(`Error fetching API Key`);
        logger.error(e);
        return response.customError({
          body: { message: e.message },
          statusCode: 500,
        });
      }
    }
  );

  router.post(
    {
      path: APIRoutes.API_KEYS,
      validate: {},
      options: {
        access: 'internal',
      },
    },
    async (context, _request, response) => {
      try {
        const core = await context.core;
        const client = core.elasticsearch.client.asCurrentUser;
        const clusterHasApiKeys = await fetchClusterHasApiKeys(client, logger);

        if (clusterHasApiKeys) {
          return response.customError({
            body: { message: 'Project already has API keys' },
            statusCode: 400,
          });
        }

        const canCreateApiKeys = await fetchUserStartPrivileges(client, logger);

        if (!canCreateApiKeys) {
          return response.customError({
            body: { message: 'User does not have required privileges' },
            statusCode: 403,
          });
        }

        const apiKey = await createAPIKey('Onboarding API Key', client, logger);

        return response.ok({
          body: apiKey,
          headers: { 'content-type': 'application/json' },
        });
      } catch (e) {
        logger.error(`Error creating API Key`);
        logger.error(e);
        return response.customError({
          body: { message: e.message },
          statusCode: 500,
        });
      }
    }
  );
}
