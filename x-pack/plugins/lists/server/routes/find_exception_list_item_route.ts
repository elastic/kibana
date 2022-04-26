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
          sort_field: sortField,
          sort_order: sortOrder,
        } = request.query;

        if (listId.length !== namespaceType.length) {
          return siemResponse.error({
            body: `list_id and namespace_id need to have the same comma separated number of values. Expected list_id length: ${listId.length} to equal namespace_type length: ${namespaceType.length}`,
            statusCode: 400,
          });
        } else {
          const exceptionListItems = await exceptionLists.findExceptionListsItem({
            filter,
            listId,
            namespaceType,
            page,
            perPage,
            pit: undefined,
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
          const [validated, errors] = validate(exceptionListItems, foundExceptionListItemSchema);
          if (errors != null) {
            return siemResponse.error({ body: errors, statusCode: 500 });
          } else {
            return response.ok({ body: validated ?? {} });
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
