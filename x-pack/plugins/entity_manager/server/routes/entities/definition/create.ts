/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { entityDefinitionSchema, createEntityDefinitionQuerySchema } from '@kbn/entities-schema';
import { v4 } from 'uuid';
import { EntityDefinitionIdInvalid } from '../../../lib/entities/errors/entity_definition_id_invalid';
import { createEntityManagerServerRoute } from '../../create_entity_manager_server_route';
import { EntityIdConflict } from '../../../lib/entities/errors/entity_id_conflict_error';
import { EntitySecurityException } from '../../../lib/entities/errors/entity_security_exception';
import { InvalidTransformError } from '../../../lib/entities/errors/invalid_transform_error';
import { EntityAPIKeyServiceDisabled } from '../../../lib/entities/errors/entity_api_key_service_disabled';
import { ERROR_API_KEY_SERVICE_DISABLED } from '../../../../common/errors';
import { EntityPermissionDenied } from '../../../lib/entities/errors/entity_permission_denied';
import { setupApiKeys } from '../../../lib/auth/setup_api_keys';

/**
 * @openapi
 * /internal/entities/definition:
 *   post:
 *     description: Install an entity definition.
 *     tags:
 *       - definitions
 *     parameters:
 *       - in: query
 *         name: installOnly
 *         description: If true, the definition transforms will not be started
 *         required: false
 *         schema:
 *           type: boolean
 *           default: false
 *     requestBody:
 *       description: The entity definition to install
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/entityDefinitionSchema'
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/entityDefinitionSchema'
 *       409:
 *         description: An entity definition with this ID already exists
 *       400:
 *         description: The entity definition cannot be installed; see the error for more details but commonly due to validation failures of the definition ID or metrics format
 */
export const createEntityDefinitionRoute = createEntityManagerServerRoute({
  endpoint: 'POST /internal/entities/definition',
  params: z.object({
    query: createEntityDefinitionQuerySchema,
    body: entityDefinitionSchema,
  }),
  handler: async ({
    context,
    request,
    response,
    params,
    logger,
    server,
    getScopedClient,
    tasks,
  }) => {
    try {
      const client = await getScopedClient({ request });
      const apiKeyId = params.body.apiKeyId ?? v4();
      const definition = await client.createEntityDefinition({
        definition: { ...params.body, apiKeyId },
        installOnly: params.query.installOnly,
      });

      // TODO There is a bunch of crap we need to deal with reguards to when
      // the setupAPiKeys call fails and reverting everything that createEntityDefinition handles.
      // I'm defering this for now since this is just a prototype and we can
      // invest more later in this area.
      await setupApiKeys(context, request, server, definition.id, apiKeyId);
      await tasks.entityMergeTask.start(definition, server);

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

      if (e instanceof EntitySecurityException || e instanceof InvalidTransformError) {
        return response.customError({ body: e, statusCode: 400 });
      }

      return response.customError({ body: e, statusCode: 500 });
    }
  },
});
