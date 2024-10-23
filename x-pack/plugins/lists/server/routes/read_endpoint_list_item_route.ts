/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import { ENDPOINT_LIST_ITEM_URL } from '@kbn/securitysolution-list-constants';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import {
  ReadEndpointListItemRequestQuery,
  ReadEndpointListItemResponse,
} from '@kbn/securitysolution-endpoint-exceptions-common/api';

import type { ListsPluginRouter } from '../types';

import {
  buildSiemResponse,
  getErrorMessageExceptionListItem,
  getExceptionListClient,
} from './utils';

export const readEndpointListItemRoute = (router: ListsPluginRouter): void => {
  router.versioned
    .get({
      access: 'public',
      options: {
        tags: ['access:lists-read'],
      },
      path: ENDPOINT_LIST_ITEM_URL,
    })
    .addVersion(
      {
        validate: {
          request: {
            query: buildRouteValidationWithZod(ReadEndpointListItemRequestQuery),
          },
        },
        version: '2023-10-31',
      },
      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);
        try {
          const { id, item_id: itemId } = request.query;
          const exceptionLists = await getExceptionListClient(context);
          if (id != null || itemId != null) {
            const exceptionListItem = await exceptionLists.getEndpointListItem({
              id,
              itemId,
            });
            if (exceptionListItem == null) {
              return siemResponse.error({
                body: getErrorMessageExceptionListItem({ id, itemId }),
                statusCode: 404,
              });
            } else {
              return response.ok({ body: ReadEndpointListItemResponse.parse(exceptionListItem) });
            }
          } else {
            return siemResponse.error({ body: 'id or item_id required', statusCode: 400 });
          }
        } catch (err) {
          const error = transformError(err);
          return siemResponse.error({
            body: error.message,
            statusCode: error.statusCode,
          });
        }
      }
    );
};
