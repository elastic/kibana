/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { v4 } from 'uuid';
import { apiScraperDefinitionSchema } from '../../../common/types';
import { createServerRoute } from '../create_server_route';

import {
  DefinitionIdInvalid,
  IdConflict,
  SecurityException,
  APIKeyServiceDisabled,
  PermissionDenied,
} from '../../lib/api/errors';
import { ERROR_API_KEY_SERVICE_DISABLED } from '../../../common/errors';

import { apiDefinitionExists } from '../../lib/api/save_definition';
import { setupApiKeys } from '../../lib/auth/setup_api_keys';
import { createDefintion } from '../../lib/api/create_defintion';

export const createApiDefinitionRoute = createServerRoute({
  endpoint: 'POST /internal/api-scraper/definition',
  params: z.object({
    body: apiScraperDefinitionSchema,
  }),
  handler: async ({
    context,
    request,
    response,
    params,
    logger,
    server,
    getScopedClients,
    tasks,
  }) => {
    try {
      const { scopedClusterClient, soClient } = await getScopedClients({ request });
      const apiKeyId = params.body.apiKeyId ?? v4();
      const alreadyExists = await apiDefinitionExists(soClient, params.body.id);
      if (alreadyExists)
        throw new IdConflict(`An definition with (${params.body.id}) already exists.`, params.body);
      await setupApiKeys(context, request, server, params.body.id, apiKeyId);

      const definition = await createDefintion({
        soClient,
        scopedClusterClient,
        rawDefinition: { ...params.body, apiKeyId },
        logger,
      });

      await tasks.apiScraperTask.start(definition, server);

      return response.ok({ body: definition });
    } catch (e) {
      logger.error(e);

      if (e instanceof DefinitionIdInvalid) {
        return response.badRequest({ body: e });
      }

      if (e instanceof APIKeyServiceDisabled) {
        return response.ok({
          body: { success: false, reason: ERROR_API_KEY_SERVICE_DISABLED, message: e.message },
        });
      }

      if (e instanceof PermissionDenied) {
        return response.forbidden({
          body: {
            message: e.message,
          },
        });
      }

      if (e instanceof IdConflict) {
        return response.conflict({ body: e });
      }

      if (e instanceof SecurityException) {
        return response.customError({ body: e, statusCode: 400 });
      }

      return response.customError({ body: e, statusCode: 500 });
    }
  },
});
