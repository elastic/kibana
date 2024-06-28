/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createValidationFunction } from '../../../common/runtime_types';
import {
  findInventoryViewResponsePayloadRT,
  inventoryViewRequestQueryRT,
  INVENTORY_VIEW_URL,
} from '../../../common/http_api/latest';
import type { InfraBackendLibs } from '../../lib/infra_types';

export const initFindInventoryViewRoute = ({
  framework,
  getStartServices,
}: Pick<InfraBackendLibs, 'framework' | 'getStartServices'>) => {
  framework.registerRoute(
    {
      method: 'get',
      path: INVENTORY_VIEW_URL,
      validate: {
        query: createValidationFunction(inventoryViewRequestQueryRT),
      },
    },
    async (_requestContext, request, response) => {
      const { query } = request;
      const [, , { inventoryViews }] = await getStartServices();
      const inventoryViewsClient = inventoryViews.getScopedClient(request);

      try {
        const inventoryViewsList = await inventoryViewsClient.find(query);

        return response.ok({
          body: findInventoryViewResponsePayloadRT.encode({ data: inventoryViewsList }),
        });
      } catch (error) {
        return response.customError({
          statusCode: error.statusCode ?? 500,
          body: {
            message: error.message ?? 'An unexpected error occurred',
          },
        });
      }
    }
  );
};
