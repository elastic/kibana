/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { createEntitiesAPIServerRoute } from '../create_entities_api_server_route';
import { PivotEntity } from '../../../common/entities';
import { builtinPivotTypes } from '../../built_in_pivots_stub';

export const getPivotsMetadataRoute = createEntitiesAPIServerRoute({
  endpoint: 'POST /internal/entities_api/pivots/metadata',
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
  handler: async (resources): Promise<{ pivots: PivotEntity[] }> => {
    const types = resources.params?.body?.types;

    const allPivots = builtinPivotTypes;

    return {
      pivots: types?.length
        ? allPivots.filter((pivot) => types.includes(pivot.pivot.type))
        : allPivots,
    };
  },
});

export const typesRoutes = {
  ...getPivotsMetadataRoute,
};
