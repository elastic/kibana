/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import { EXCEPTION_LIST_URL } from '@kbn/securitysolution-list-constants';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import {
  FindExceptionListsRequestQuery,
  FindExceptionListsResponse,
} from '@kbn/securitysolution-exceptions-common/api';

import type { ListsPluginRouter } from '../types';

import { buildSiemResponse, getExceptionListClient } from './utils';

export const findExceptionListRoute = (router: ListsPluginRouter): void => {
  router.versioned
    .get({
      access: 'public',
      path: `${EXCEPTION_LIST_URL}/_find`,
      security: {
        authz: {
          requiredPrivileges: ['lists-read'],
        },
      },
    })
    .addVersion(
      {
        validate: {
          request: {
            query: buildRouteValidationWithZod(FindExceptionListsRequestQuery),
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
            page,
            namespace_type: namespaceType,
            per_page: perPage,
            sort_field: sortField,
            sort_order: sortOrder,
          } = request.query;
          const exceptionListItems = await exceptionLists.findExceptionList({
            filter,
            namespaceType,
            page,
            perPage,
            pit: undefined,
            searchAfter: undefined,
            sortField,
            sortOrder,
          });

          return response.ok({ body: FindExceptionListsResponse.parse(exceptionListItems) });
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
