/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isBoom } from '@hapi/boom';
import { createValidationFunction } from '../../../common/runtime_types';
import {
  inventoryViewRequestParamsRT,
  INVENTORY_VIEW_URL_ENTITY,
} from '../../../common/http_api/latest';
import type { InfraBackendLibs } from '../../lib/infra_types';

export const initDeleteInventoryViewRoute = ({
  framework,
  getStartServices,
}: Pick<InfraBackendLibs, 'framework' | 'getStartServices'>) => {
  framework.registerRoute(
    {
      method: 'delete',
      path: INVENTORY_VIEW_URL_ENTITY,
      validate: {
        params: createValidationFunction(inventoryViewRequestParamsRT),
      },
    },
    async (_requestContext, request, response) => {
      const { params } = request;
      const [, , { inventoryViews }] = await getStartServices();
      const inventoryViewsClient = inventoryViews.getScopedClient(request);

      try {
        await inventoryViewsClient.delete(params.inventoryViewId);

        return response.noContent();
      } catch (error) {
        if (isBoom(error)) {
          return response.customError({
            statusCode: error.output.statusCode,
            body: { message: error.output.payload.message },
          });
        }

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
