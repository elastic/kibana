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
  DuplicateExceptionListRequestQuery,
  DuplicateExceptionListResponse,
} from '@kbn/securitysolution-exceptions-common/api';

import type { ListsPluginRouter } from '../types';

import { buildSiemResponse, getExceptionListClient } from './utils';

export const duplicateExceptionsRoute = (router: ListsPluginRouter): void => {
  router.versioned
    .post({
      access: 'public',
      options: {
        tags: ['access:lists-all'],
      },
      path: `${EXCEPTION_LIST_URL}/_duplicate`,
    })
    .addVersion(
      {
        validate: {
          request: {
            query: buildRouteValidationWithZod(DuplicateExceptionListRequestQuery),
          },
        },
        version: '2023-10-31',
      },
      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);

        try {
          const {
            list_id: listId,
            namespace_type: namespaceType,
            include_expired_exceptions: includeExpiredExceptionsString,
          } = request.query;

          const exceptionListsClient = await getExceptionListClient(context);

          // fetch list container
          const listToDuplicate = await exceptionListsClient.getExceptionList({
            id: undefined,
            listId,
            namespaceType,
          });

          if (listToDuplicate == null) {
            return siemResponse.error({
              body: `exception list id: "${listId}" does not exist`,
              statusCode: 404,
            });
          }

          // Defaults to including expired exceptions if query param is not present
          const includeExpiredExceptions =
            includeExpiredExceptionsString !== undefined
              ? includeExpiredExceptionsString === 'true'
              : true;
          const duplicatedList = await exceptionListsClient.duplicateExceptionListAndItems({
            includeExpiredExceptions,
            list: listToDuplicate,
            namespaceType,
          });

          if (duplicatedList == null) {
            return siemResponse.error({
              body: `unable to duplicate exception list with list_id: ${listId} - action not allowed`,
              statusCode: 405,
            });
          }

          return response.ok({ body: DuplicateExceptionListResponse.parse(duplicatedList) });
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
