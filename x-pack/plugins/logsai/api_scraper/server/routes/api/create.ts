/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { v4 } from 'uuid';
import { apiScraperDefinitionSchema } from '../../../common/types';
import { createApiScraperServerRoute } from '../create_api_scraper_server_route';

import { ApiDefinitionIdInvalid } from '../../lib/api/errors/api_scraper_definition_id_invalid';
import { ApiScraperIdConflict } from '../../lib/api/errors/api_scraper_id_conflict_error';
import { ApiScraperSecurityException } from '../../lib/api/errors/api_scraper_security_exception';
import { ApiScraperAPIKeyServiceDisabled } from '../../lib/api/errors/api_scraper_api_key_service_disabled';
import { ERROR_API_KEY_SERVICE_DISABLED } from '../../../common/errors';
import { ApiScraperPermissionDenied } from '../../lib/api/errors/api_scraper_permission_denied';

import { apiDefinitionExists, saveApiDefinition } from '../../lib/api/save_api_definition';
import { setupApiKeys } from '../../lib/auth/setup_api_keys';
import { upsertTemplate } from '../../templates/manage_index_templates';
import { generateInstanceIndexTemplateConfig } from '../../lib/api/templates/api_scraper_instance';

export const createApiDefinitionRoute = createApiScraperServerRoute({
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
        throw new ApiScraperIdConflict(
          `An definition with (${params.body.id}) already exists.`,
          params.body
        );
      const definition = await saveApiDefinition(soClient, {
        ...params.body,
        apiKeyId,
      });

      await upsertTemplate({
        esClient: scopedClusterClient.asSecondaryAuthUser,
        logger,
        template: generateInstanceIndexTemplateConfig(definition),
      });
      await setupApiKeys(context, request, server, definition.id, apiKeyId);
      await tasks.apiScraperTask.start(definition, server);

      return response.ok({ body: definition });
    } catch (e) {
      logger.error(e);

      if (e instanceof ApiDefinitionIdInvalid) {
        return response.badRequest({ body: e });
      }

      if (e instanceof ApiScraperAPIKeyServiceDisabled) {
        return response.ok({
          body: { success: false, reason: ERROR_API_KEY_SERVICE_DISABLED, message: e.message },
        });
      }

      if (e instanceof ApiScraperPermissionDenied) {
        return response.forbidden({
          body: {
            message: e.message,
          },
        });
      }

      if (e instanceof ApiScraperIdConflict) {
        return response.conflict({ body: e });
      }

      if (e instanceof ApiScraperSecurityException) {
        return response.customError({ body: e, statusCode: 400 });
      }

      return response.customError({ body: e, statusCode: 500 });
    }
  },
});
