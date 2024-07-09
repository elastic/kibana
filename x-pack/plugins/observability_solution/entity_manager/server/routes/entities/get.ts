/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RequestHandlerContext } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { SetupRouteOptions } from '../types';
import { ENTITY_INTERNAL_API_PREFIX } from '../../../common/constants_entities';
import {
  findEntityDefinitions,
  getEntityDefinitionState,
} from '../../lib/entities/find_entity_definition';
import { readEntityDefinition } from '../../lib/entities/read_entity_definition';
import { EntityDefinitionWithState } from '../../lib/entities/types';

export function getEntityDefinitionRoute<T extends RequestHandlerContext>({
  router,
  logger,
}: SetupRouteOptions<T>) {
  router.get<unknown, { page?: number; perPage?: number; id?: string }, unknown>(
    {
      path: `${ENTITY_INTERNAL_API_PREFIX}/definition`,
      validate: {
        query: schema.object({
          page: schema.maybe(schema.number()),
          perPage: schema.maybe(schema.number()),
          id: schema.maybe(schema.string()),
        }),
      },
    },
    async (context, req, res) => {
      try {
        const esClient = (await context.core).elasticsearch.client.asCurrentUser;
        const soClient = (await context.core).savedObjects.client;

        let definitions: EntityDefinitionWithState[];
        if (req.query.id) {
          const attributes = await readEntityDefinition(soClient, req.query.id, logger);
          const state = await getEntityDefinitionState(esClient, attributes);

          definitions = [{ ...attributes, state }];
        } else {
          definitions = await findEntityDefinitions({
            esClient,
            soClient,
            page: req.query.page ?? 1,
            perPage: req.query.perPage ?? 10,
          });
        }

        return res.ok({ body: definitions });
      } catch (e) {
        return res.customError({ body: e, statusCode: 500 });
      }
    }
  );
}
