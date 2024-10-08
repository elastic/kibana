/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { createEntitiesAPIServerRoute } from '../create_entities_api_server_route';
import { DefinitionEntity } from '../../../common/entities';
import { getDefinitionEntities } from '../../lib/get_definition_entities';
import { createEntitiesAPIEsClient } from '../../lib/clients/create_entities_api_es_client';

export const getDefinitionsMetadataRoute = createEntitiesAPIServerRoute({
  endpoint: 'POST /internal/entities_api/definitions/metadata',
  options: {
    tags: ['access:entities'],
  },
  params: z
    .object({
      body: z
        .object({
          types: z.array(z.string()),
        })
        .partial(),
    })
    .partial(),
  handler: async (resources): Promise<{ definitions: DefinitionEntity[] }> => {
    const types = resources.params?.body?.types;

    const esClient = await createEntitiesAPIEsClient(resources);

    const definitionEntities = await getDefinitionEntities({
      esClient,
    });

    return {
      definitions: types?.length
        ? definitionEntities.filter((definitionEntity) => types.includes(definitionEntity.type))
        : definitionEntities,
    };
  },
});

export const typesRoutes = {
  ...getDefinitionsMetadataRoute,
};
