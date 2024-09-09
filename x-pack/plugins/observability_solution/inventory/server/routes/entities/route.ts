/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import type { EntityTypeDefinition } from '../../../common/entities';
import { createInventoryServerRoute } from '../create_inventory_server_route';

export const listEntityTypesRoute = createInventoryServerRoute({
  endpoint: 'GET /internal/inventory/entity_types',
  options: {
    tags: ['access:inventory'],
  },
  handler: async ({ plugins, request }): Promise<{ definitions: EntityTypeDefinition[] }> => {
    return {
      definitions: [
        {
          label: i18n.translate('xpack.inventory.entityTypeLabels.datasets', {
            defaultMessage: 'Datasets',
          }),
          icon: 'pipeNoBreaks',
          type: 'dataset',
          count: 0,
        },
      ],
    };
  },
});

export const entitiesRoutes = {
  ...listEntityTypesRoute,
};
