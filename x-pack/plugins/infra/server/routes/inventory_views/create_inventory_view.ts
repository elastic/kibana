/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isBoom } from '@hapi/boom';
import { createValidationFunction } from '../../../common/runtime_types';
import {
  createInventoryViewRequestPayloadRT,
  inventoryViewResponsePayloadRT,
  INVENTORY_VIEW_URL,
} from '../../../common/http_api/latest';
import type { InfraBackendLibs } from '../../lib/infra_types';

export const initCreateInventoryViewRoute = ({
  framework,
  getStartServices,
}: Pick<InfraBackendLibs, 'framework' | 'getStartServices'>) => {
  framework.registerRoute(
    {
      method: 'post',
      path: INVENTORY_VIEW_URL,
      validate: {
        body: createValidationFunction(createInventoryViewRequestPayloadRT),
      },
    },
    async (_requestContext, request, response) => {
      const { body } = request;
      const [, , { inventoryViews }] = await getStartServices();
      const inventoryViewsClient = inventoryViews.getScopedClient(request);

      try {
        const inventoryView = await inventoryViewsClient.create(body.attributes);

        return response.custom({
          statusCode: 201,
          body: inventoryViewResponsePayloadRT.encode({ data: inventoryView }),
        });
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
