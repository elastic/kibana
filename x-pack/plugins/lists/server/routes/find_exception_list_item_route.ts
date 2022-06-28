/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validate } from '@kbn/securitysolution-io-ts-utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import {
  FindExceptionListItemSchemaDecoded,
  findExceptionListItemSchema,
  foundExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import { EXCEPTION_LIST_ITEM_URL } from '@kbn/securitysolution-list-constants';

import type { ListsPluginRouter } from '../types';

import { buildRouteValidation, buildSiemResponse, getExceptionListClient } from './utils';

export const findExceptionListItemRoute = (router: ListsPluginRouter): void => {
  router.get(
    {
      options: {
        tags: ['access:lists-read'],
      },
      path: `${EXCEPTION_LIST_ITEM_URL}/_find`,
      validate: {
        query: buildRouteValidation<
          typeof findExceptionListItemSchema,
          FindExceptionListItemSchemaDecoded
        >(findExceptionListItemSchema),
      },
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
          pit,
          search_after: searchAfter,
          sort_field: sortField,
          sort_order: sortOrder,
        } = request.query;

        if (listId != null && listId.length !== namespaceType.length) {
          return siemResponse.error({
            body: `list_id and namespace_id need to have the same comma separated number of values. Expected list_id length: ${listId.length} to equal namespace_type length: ${namespaceType.length}`,
            statusCode: 400,
          });
        } else {
          const core = await context.core;
          const savedObjectsClient = core.savedObjects.getClient();
          const pitId = pit ?? await savedObjectsClient.openPointInTimeForType(
            'exceptionItems',
            { keepAlive: '5m' },
          );
        
          const items = await exceptionLists.findExceptionListsItem({
            filter,
            listId,
            namespaceType,
            page,
            perPage,
            pit: pitId,
            searchAfter,
            sortField,
            sortOrder,
          });
          
          const searchAfterValue = items.saved_objects[items.saved_objects.length - 1].sort;

          const [validated, errors] = validate(items, foundExceptionListItemSchema);
          if (errors != null) {
            return siemResponse.error({ body: errors, statusCode: 500 });
          } else {
            return response.ok({
              body: {
                ...validated,
                pit: { id: validated.pit, keepAlive: '2m' },
                searchAfter: searchAfterValue
              } ?? {} 
            });
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
