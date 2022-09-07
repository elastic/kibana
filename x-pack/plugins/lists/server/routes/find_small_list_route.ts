/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validate } from '@kbn/securitysolution-io-ts-utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import { findListSchema, foundSmallListSchema } from '@kbn/securitysolution-io-ts-list-types';
import {
  INTERNAL_LIST_URL,
  MAXIMUM_SMALL_VALUE_LIST_SIZE,
} from '@kbn/securitysolution-list-constants';
import { partition } from 'lodash';

import type { ListsPluginRouter } from '../types';
import { decodeCursor } from '../services/utils';

import { buildRouteValidation, buildSiemResponse, getListClient } from './utils';

export const findSmallListRoute = (router: ListsPluginRouter): void => {
  router.get(
    {
      options: {
        tags: ['access:lists-read'],
      },
      path: `${INTERNAL_LIST_URL}/_find_small`, // TODO: probably use a better name
      validate: {
        query: buildRouteValidation(findListSchema),
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      try {
        const listClient = await getListClient(context);
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
          const valueLists = await listClient.findList({
            currentIndexPosition,
            filter,
            page,
            perPage,
            searchAfter,
            sortField,
            sortOrder,
          });

          const listBooleans = await Promise.all(
            valueLists.data.map(async (valueList) => {
              const list = await listClient.findListItem({
                currentIndexPosition: 0,
                filter: '',
                listId: valueList.id,
                page: 0,
                perPage: 0,
                searchAfter: [],
                sortField: undefined,
                sortOrder: undefined,
              });

              if (
                valueList.type === 'ip_range' &&
                list &&
                list.total < MAXIMUM_SMALL_VALUE_LIST_SIZE
              ) {
                const rangeList = await listClient.findAllListItems({
                  filter: '',
                  listId: valueList.id,
                });
                const [dashNotationRange, slashNotationRange] = partition(
                  rangeList?.data,
                  ({ value }) => {
                    return value.includes('-');
                  }
                );
                return (
                  dashNotationRange.length < 200 &&
                  slashNotationRange.length < MAXIMUM_SMALL_VALUE_LIST_SIZE
                );
              }
              return list && list.total < MAXIMUM_SMALL_VALUE_LIST_SIZE ? true : false;
            })
          );

          const smallLists = valueLists.data.filter((valueList, index) => listBooleans[index]);
          const largeLists = valueLists.data.filter((valueList, index) => !listBooleans[index]);

          const [validated, errors] = validate({ largeLists, smallLists }, foundSmallListSchema);
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
