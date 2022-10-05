/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validate } from '@kbn/securitysolution-io-ts-utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import { findListSchema, foundListsBySizeSchema } from '@kbn/securitysolution-io-ts-list-types';
import {
  FIND_LISTS_BY_SIZE,
  MAXIMUM_SMALL_IP_RANGE_VALUE_LIST_DASH_SIZE,
  MAXIMUM_SMALL_VALUE_LIST_SIZE,
} from '@kbn/securitysolution-list-constants';
import { chunk } from 'lodash';

import type { ListsPluginRouter } from '../types';
import { decodeCursor } from '../services/utils';

import { buildRouteValidation, buildSiemResponse, getListClient } from './utils';

export const findListsBySizeRoute = (router: ListsPluginRouter): void => {
  router.get(
    {
      options: {
        tags: ['access:lists-read'],
      },
      path: `${FIND_LISTS_BY_SIZE}`,
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
            runtimeMappings: undefined,
            searchAfter,
            sortField,
            sortOrder,
          });

          const listBooleans: boolean[] = [];

          const chunks = chunk(valueLists.data, 10);
          for (const listChunk of chunks) {
            const booleans = await Promise.all(
              listChunk.map(async (valueList) => {
                // Currently the only list types we support for exceptions
                if (
                  valueList.type !== 'ip_range' &&
                  valueList.type !== 'ip' &&
                  valueList.type !== 'keyword'
                ) {
                  return false;
                }

                const list = await listClient.findListItem({
                  currentIndexPosition: 0,
                  filter: '',
                  listId: valueList.id,
                  page: 0,
                  perPage: 0,
                  runtimeMappings: undefined,
                  searchAfter: [],
                  sortField: undefined,
                  sortOrder: undefined,
                });

                if (
                  valueList.type === 'ip_range' &&
                  list &&
                  list.total < MAXIMUM_SMALL_VALUE_LIST_SIZE
                ) {
                  const rangeList = await listClient.findListItem({
                    currentIndexPosition: 0,
                    filter: 'is_cidr: false',
                    listId: valueList.id,
                    page: 0,
                    perPage: 0,
                    runtimeMappings: {
                      is_cidr: {
                        script: `
                          if (params._source["ip_range"] instanceof String) {
                            emit(true);
                          } else {
                            emit(false);
                          }
                          `,
                        type: 'boolean',
                      },
                    },
                    searchAfter: [],
                    sortField: undefined,
                    sortOrder: undefined,
                  });

                  return rangeList && rangeList.total < MAXIMUM_SMALL_IP_RANGE_VALUE_LIST_DASH_SIZE
                    ? true
                    : false;
                }
                return list && list.total < MAXIMUM_SMALL_VALUE_LIST_SIZE ? true : false;
              })
            );
            listBooleans.push(...booleans);
          }

          const smallLists = valueLists.data.filter((valueList, index) => listBooleans[index]);
          const largeLists = valueLists.data.filter((valueList, index) => !listBooleans[index]);

          const [validated, errors] = validate({ largeLists, smallLists }, foundListsBySizeSchema);
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
