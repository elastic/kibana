/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validate } from '@kbn/securitysolution-io-ts-utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import {
  FindEndpointListItemSchemaDecoded,
  findEndpointListItemSchema,
  foundExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import { ENDPOINT_LIST_ID, ENDPOINT_LIST_ITEM_URL } from '@kbn/securitysolution-list-constants';

import type { ListsPluginRouter } from '../types';

import { buildRouteValidation, buildSiemResponse, getExceptionListClient } from './utils';

export const findEndpointListItemRoute = (router: ListsPluginRouter): void => {
  router.get(
    {
      options: {
        tags: ['access:lists-read'],
      },
      path: `${ENDPOINT_LIST_ITEM_URL}/_find`,
      validate: {
        query: buildRouteValidation<
          typeof findEndpointListItemSchema,
          FindEndpointListItemSchemaDecoded
        >(findEndpointListItemSchema),
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      try {
        const exceptionLists = await getExceptionListClient(context);
        const {
          filter,
          page,
          per_page: perPage,
          sort_field: sortField,
          sort_order: sortOrder,
        } = request.query;

        const exceptionListItems = await exceptionLists.findEndpointListItem({
          filter,
          page,
          perPage,
          pit: undefined,
          searchAfter: undefined,
          sortField,
          sortOrder,
        });
        if (exceptionListItems == null) {
          // Although I have this line of code here, this is an incredibly rare thing to have
          // happen as the findEndpointListItem tries to auto-create the endpoint list if
          // does not exist.
          return siemResponse.error({
            body: `list id: "${ENDPOINT_LIST_ID}" does not exist`,
            statusCode: 404,
          });
        }
        const [validated, errors] = validate(exceptionListItems, foundExceptionListItemSchema);
        if (errors != null) {
          return siemResponse.error({ body: errors, statusCode: 500 });
        } else {
          return response.ok({ body: validated ?? {} });
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
