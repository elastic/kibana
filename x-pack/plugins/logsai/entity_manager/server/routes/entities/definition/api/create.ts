/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { apiEntityDefinitionSchema } from '@kbn/entities-schema';
import { v4 } from 'uuid';
import { EntityDefinitionIdInvalid } from '../../../../lib/entities/errors/entity_definition_id_invalid';
import { createEntityManagerServerRoute } from '../../../create_entity_manager_server_route';
import { EntityIdConflict } from '../../../../lib/entities/errors/entity_id_conflict_error';
import { EntitySecurityException } from '../../../../lib/entities/errors/entity_security_exception';
import { EntityAPIKeyServiceDisabled } from '../../../../lib/entities/errors/entity_api_key_service_disabled';
import { ERROR_API_KEY_SERVICE_DISABLED } from '../../../../../common/errors';
import { EntityPermissionDenied } from '../../../../lib/entities/errors/entity_permission_denied';
import {
  entityApiDefinitionExists,
  saveApiEntityDefinition,
} from '../../../../lib/entities/save_entity_definition';
import { setupApiKeys } from '../../../../lib/auth/setup_api_keys';
import { upsertTemplate } from '../../../../lib/manage_index_templates';
import { generateEntitiesInstanceIndexTemplateConfig } from '../../../../lib/entities/templates/entities_instance';

export const createEntityAPIDefinitionRoute = createEntityManagerServerRoute({
  endpoint: 'POST /internal/entities/api/definition',
  params: z.object({
    body: apiEntityDefinitionSchema,
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
      const alreadyExists = await entityApiDefinitionExists(soClient, params.body.id);
      if (alreadyExists)
        throw new EntityIdConflict(
          `An entity with (${params.body.id}) already exists.`,
          params.body
        );
      const definition = await saveApiEntityDefinition(soClient, {
        ...params.body,
        apiKeyId,
      });

      await upsertTemplate({
        esClient: scopedClusterClient.asSecondaryAuthUser,
        logger,
        template: generateEntitiesInstanceIndexTemplateConfig(definition),
      });

      // TODO There is a bunch of crap we need to deal with reguards to when
      // the setupAPiKeys call fails and reverting everything that createEntityDefinition handles.
      // I'm defering this for now since this is just a prototype and we can
      // invest more later in this area.
      await setupApiKeys(context, request, server, definition.id, apiKeyId);
      await tasks.entityElasticsearchApiTask.start(definition, server);

      return response.ok({ body: definition });
    } catch (e) {
      logger.error(e);

      if (e instanceof EntityDefinitionIdInvalid) {
        return response.badRequest({ body: e });
      }

      if (e instanceof EntityAPIKeyServiceDisabled) {
        return response.ok({
          body: { success: false, reason: ERROR_API_KEY_SERVICE_DISABLED, message: e.message },
        });
      }

      if (e instanceof EntityPermissionDenied) {
        return response.forbidden({
          body: {
            message: e.message,
          },
        });
      }

      if (e instanceof EntityIdConflict) {
        return response.conflict({ body: e });
      }

      if (e instanceof EntitySecurityException) {
        return response.customError({ body: e, statusCode: 400 });
      }

      return response.customError({ body: e, statusCode: 500 });
    }
  },
});
