/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import { LIST_URL } from '@kbn/securitysolution-list-constants';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import { FindListsRequestQuery, FindListsResponse } from '@kbn/securitysolution-lists-common/api';

import type { ListsPluginRouter } from '../../types';
import { decodeCursor } from '../../services/utils';
import { buildSiemResponse, getListClient } from '../utils';

export const findListRoute = (router: ListsPluginRouter): void => {
  router.versioned
    .get({
      access: 'public',
      options: {
        tags: ['access:lists-read'],
      },
      path: `${LIST_URL}/_find`,
    })
    .addVersion(
      {
        validate: {
          request: {
            query: buildRouteValidationWithZod(FindListsRequestQuery),
          },
        },
        version: '2023-10-31',
      },
      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);
        try {
          const lists = await getListClient(context);
          const {
            cursor,
            filter: filterOrUndefined,
            page: pageOrUndefined,
            per_page: perPageOrUndefined,
            sort_field: sortField,
            sort_order: sortOrder,
          } = request.query;

          const page = pageOrUndefined ?? 1;
          const perPage = perPageOrUndefined ?? 20;
          const filter = filterOrUndefined ?? '';
          const {
            isValid,
            errorMessage,
            cursor: [currentIndexPosition, searchAfter],
          } = decodeCursor({
            cursor,
            page,
            perPage,
            sortField,
          });
          if (!isValid) {
            return siemResponse.error({
              body: errorMessage,
              statusCode: 400,
            });
          } else {
            const exceptionList = await lists.findList({
              currentIndexPosition,
              filter,
              page,
              perPage,
              runtimeMappings: undefined,
              searchAfter,
              sortField,
              sortOrder,
            });

            return response.ok({ body: FindListsResponse.parse(exceptionList) });
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
