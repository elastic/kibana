/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { notFound } from '@hapi/boom';
import { createEntitiesAPIServerRoute } from '../create_entities_api_server_route';
import { DefinitionEntity, EntityTypeDefinition } from '../../../common/entities';
import { getTypeDefinitions } from '../../lib/entities/get_type_definitions';
import { createEntitiesAPIEsClient } from '../../lib/clients/create_entities_api_es_client';
import { getDefinitionEntities } from '../../lib/entities/get_definition_entities';

export const getAllTypeDefinitionsRoute = createEntitiesAPIServerRoute({
  endpoint: 'GET /internal/entities_api/types',
  options: {
    tags: ['access:entities'],
  },
  handler: async (
    resources
  ): Promise<{
    typeDefinitions: EntityTypeDefinition[];
    definitionEntities: DefinitionEntity[];
  }> => {
    const esClient = await createEntitiesAPIEsClient(resources);

    const [typeDefinitions, definitionEntities] = await Promise.all([
      getTypeDefinitions({
        esClient,
      }),
      getDefinitionEntities({
        esClient,
      }),
    ]);

    return {
      typeDefinitions,
      definitionEntities,
    };
  },
});

export const getTypeDefinitionRoute = createEntitiesAPIServerRoute({
  endpoint: 'GET /internal/entities_api/types/{type}',
  options: {
    tags: ['access:entities'],
  },
  params: z.object({
    path: z.object({
      type: z.string(),
    }),
  }),
  handler: async (
    resources
  ): Promise<{ typeDefinition: EntityTypeDefinition; definitionEntities: DefinitionEntity[] }> => {
    const esClient = await createEntitiesAPIEsClient(resources);

    const {
      path: { type },
    } = resources.params;

    const [typeDefinitions, definitionEntities] = await Promise.all([
      getTypeDefinitions({
        esClient,
      }),
      getDefinitionEntities({
        esClient,
      }),
    ]);

    const typeDefinition = typeDefinitions.find((definition) => definition.pivot.type === type);

    if (!typeDefinition) {
      throw notFound();
    }

    const definitionEntitiesForType = definitionEntities.filter(
      (definitionEntity) => definitionEntity.type === type
    );

    return {
      typeDefinition,
      definitionEntities: definitionEntitiesForType,
    };
  },
});

export const typesRoutes = {
  ...getTypeDefinitionRoute,
  ...getAllTypeDefinitionsRoute,
};
