/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import { EXCEPTION_LIST_ITEM_URL } from '@kbn/securitysolution-list-constants';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import {
  FindExceptionListItemsRequestQuery,
  FindExceptionListItemsResponse,
} from '@kbn/securitysolution-exceptions-common/api';

import type { ListsPluginRouter } from '../types';

import { buildSiemResponse, getExceptionListClient } from './utils';

export const findExceptionListItemRoute = (router: ListsPluginRouter): void => {
  router.versioned
    .get({
      access: 'public',
      options: {
        tags: ['access:lists-read'],
      },
      path: `${EXCEPTION_LIST_ITEM_URL}/_find`,
    })
    .addVersion(
      {
        validate: {
          request: {
            query: buildRouteValidationWithZod(FindExceptionListItemsRequestQuery),
          },
        },
        version: '2023-10-31',
      },
      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);
        try {
          const exceptionLists = await getExceptionListClient(context);
          const {
            filter,
            list_id: listId,
            namespace_type: namespaceType,
            page,
            per_page: perPage,
            search,
            sort_field: sortField,
            sort_order: sortOrder,
          } = request.query;

          if (listId.length !== namespaceType.length) {
            return siemResponse.error({
              body: `list_id and namespace_id need to have the same comma separated number of values. Expected list_id length: ${listId.length} to equal namespace_type length: ${namespaceType.length}`,
              statusCode: 400,
            });
          } else if (listId.length !== filter.length && filter.length !== 0) {
            return siemResponse.error({
              body: `list_id and filter need to have the same comma separated number of values. Expected list_id length: ${listId.length} to equal filter length: ${filter.length}`,
              statusCode: 400,
            });
          }

          const exceptionListItems = await exceptionLists.findExceptionListsItem({
            filter,
            listId,
            namespaceType,
            page,
            perPage,
            pit: undefined,
            search,
            searchAfter: undefined,
            sortField,
            sortOrder,
          });

          if (exceptionListItems == null) {
            return siemResponse.error({
              body: `exception list id: "${listId}" does not exist`,
              statusCode: 404,
            });
          }

          return response.ok({ body: FindExceptionListItemsResponse.parse(exceptionListItems) });
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
