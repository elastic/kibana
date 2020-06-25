/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from 'kibana/server';

import { LIST_ITEM_URL } from '../../common/constants';
import { buildRouteValidation, buildSiemResponse, transformError } from '../siem_server_deps';
import { validate } from '../../common/siem_common_deps';
import { findListItemSchema, foundListItemSchema } from '../../common/schemas';
import { decodeCursor } from '../services/utils';

import { getListClient } from './utils';

export const findListItemRoute = (router: IRouter): void => {
  router.get(
    {
      options: {
        tags: ['access:lists'],
      },
      path: `${LIST_ITEM_URL}/_find`,
      validate: {
        query: buildRouteValidation(findListItemSchema),
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      try {
        const lists = getListClient(context);
        const {
          cursor,
          filter: filterOrUndefined,
          list_id: listId,
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
          const exceptionList = await lists.findListItem({
            currentIndexPosition,
            filter,
            listId,
            page,
            perPage,
            searchAfter,
            sortField,
            sortOrder,
          });
          if (exceptionList == null) {
            return siemResponse.error({
              body: `list id: "${listId}" does not exist`,
              statusCode: 404,
            });
          } else {
            const [validated, errors] = validate(exceptionList, foundListItemSchema);
            if (errors != null) {
              return siemResponse.error({ body: errors, statusCode: 500 });
            } else {
              return response.ok({ body: validated ?? {} });
            }
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
