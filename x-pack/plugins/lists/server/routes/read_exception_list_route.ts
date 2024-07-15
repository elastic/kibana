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
  GetExceptionListRequestQuery,
  GetExceptionListResponse,
} from '@kbn/securitysolution-exceptions-common/api';

import type { ListsPluginRouter } from '../types';

import { buildSiemResponse, getErrorMessageExceptionList, getExceptionListClient } from './utils';

export const readExceptionListRoute = (router: ListsPluginRouter): void => {
  router.versioned
    .get({
      access: 'public',
      options: {
        tags: ['access:lists-read'],
      },
      path: EXCEPTION_LIST_URL,
    })
    .addVersion(
      {
        validate: {
          request: {
            query: buildRouteValidationWithZod(GetExceptionListRequestQuery),
          },
        },
        version: '2023-10-31',
      },
      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);
        try {
          const { id, list_id: listId, namespace_type: namespaceType } = request.query;
          const exceptionLists = await getExceptionListClient(context);

          if (id == null && listId == null) {
            return siemResponse.error({ body: 'id or list_id required', statusCode: 400 });
          }

          const exceptionList = await exceptionLists.getExceptionList({
            id,
            listId,
            namespaceType,
          });
          if (exceptionList == null) {
            return siemResponse.error({
              body: getErrorMessageExceptionList({ id, listId }),
              statusCode: 404,
            });
          }

          return response.ok({ body: GetExceptionListResponse.parse(exceptionList) });
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
