/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { transformError } from '@kbn/securitysolution-es-utils';
import { ENDPOINT_LIST_ID, ENDPOINT_LIST_ITEM_URL } from '@kbn/securitysolution-list-constants';
import { buildRouteValidationWithZod, stringifyZodError } from '@kbn/zod-helpers';
import {
  CreateEndpointListItemRequestBody,
  CreateEndpointListItemResponse,
} from '@kbn/securitysolution-endpoint-exceptions-common/api';

import type { ListsPluginRouter } from '../types';

import { buildSiemResponse, getExceptionListClient } from './utils';
import { validateExceptionListSize } from './validate';

export const createEndpointListItemRoute = (router: ListsPluginRouter): void => {
  router.versioned
    .post({
      access: 'public',
      options: {
        tags: ['access:lists-all'],
      },
      path: ENDPOINT_LIST_ITEM_URL,
    })
    .addVersion(
      {
        validate: {
          request: {
            body: buildRouteValidationWithZod(CreateEndpointListItemRequestBody),
          },
        },
        version: '2023-10-31',
      },
      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);
        try {
          const {
            name,
            tags,
            meta,
            comments,
            description,
            entries,
            item_id: itemId = uuidv4(),
            os_types: osTypes,
            type,
          } = request.body;
          const exceptionLists = await getExceptionListClient(context);
          const exceptionListItem = await exceptionLists.getEndpointListItem({
            id: undefined,
            itemId,
          });
          if (exceptionListItem != null) {
            return siemResponse.error({
              body: `exception list item id: "${itemId}" already exists`,
              statusCode: 409,
            });
          } else {
            const createdList = await exceptionLists.createEndpointListItem({
              comments,
              description,
              entries,
              itemId,
              meta,
              name,
              osTypes,
              tags,
              type,
            });

            const { success, data, error } = CreateEndpointListItemResponse.safeParse(createdList);
            if (success === false) {
              return siemResponse.error({ body: stringifyZodError(error), statusCode: 500 });
            } else {
              const listSizeError = await validateExceptionListSize(
                exceptionLists,
                ENDPOINT_LIST_ID,
                'agnostic'
              );
              if (listSizeError != null) {
                await exceptionLists.deleteExceptionListItemById({
                  id: createdList.id,
                  namespaceType: 'agnostic',
                });
                return siemResponse.error(listSizeError);
              }
              return response.ok({ body: data ?? {} });
            }
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
