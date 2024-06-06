/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RequestHandlerContext } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { SetupRouteOptions } from '../types';
import { EntitySecurityException } from '../../lib/entities/errors/entity_security_exception';
import { InvalidTransformError } from '../../lib/entities/errors/invalid_transform_error';
import { readEntityDefinition } from '../../lib/entities/read_entity_definition';
import { EntityDefinitionNotFound } from '../../lib/entities/errors/entity_not_found';
import { ENTITY_INTERNAL_API_PREFIX } from '../../../common/constants_entities';
import { uninstallEntityDefinition } from '../../lib/entities/uninstall_entity_definition';

export function deleteEntityDefinitionRoute<T extends RequestHandlerContext>({
  router,
  server,
}: SetupRouteOptions<T>) {
  router.delete<{ id: string }, unknown, unknown>(
    {
      path: `${ENTITY_INTERNAL_API_PREFIX}/definition/{id}`,
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    async (context, req, res) => {
      try {
        const { logger } = server;
        const soClient = (await context.core).savedObjects.client;
        const esClient = (await context.core).elasticsearch.client.asCurrentUser;

        const definition = await readEntityDefinition(soClient, req.params.id, logger);
        await uninstallEntityDefinition({ definition, soClient, esClient, logger });

        return res.ok({ body: { acknowledged: true } });
      } catch (e) {
        if (e instanceof EntityDefinitionNotFound) {
          return res.notFound({ body: e });
        }
        if (e instanceof EntitySecurityException || e instanceof InvalidTransformError) {
          return res.customError({ body: e, statusCode: 400 });
        }
        return res.customError({ body: e, statusCode: 500 });
      }
    }
  );
}
