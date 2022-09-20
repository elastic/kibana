/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import {
  CreateExceptionListItemSchema,
  ExceptionListItemSchema,
  FoundExceptionListItemSchema,
  getExceptionFilterSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import { EXCEPTION_FILTER } from '@kbn/securitysolution-list-constants';

import { buildExceptionFilter } from '../services/exception_lists/build_exception_filter';
import { ListsPluginRouter } from '../types';

import { buildRouteValidation, buildSiemResponse } from './utils';

export const getExceptionFilterRoute = (router: ListsPluginRouter): void => {
  router.post(
    {
      options: {
        tags: ['access:securitySolution'],
      },
      path: `${EXCEPTION_FILTER}`,
      validate: {
        body: buildRouteValidation(getExceptionFilterSchema),
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      try {
        const ctx = await context.resolve(['lists']);
        const listClient = ctx.lists?.getListClient();
        if (!listClient) {
          return siemResponse.error({ body: 'Cannot retrieve list client', statusCode: 500 });
        }
        const exceptionListClient = ctx.lists?.getExceptionListClient();
        const exceptionItems: Array<ExceptionListItemSchema | CreateExceptionListItemSchema> = [];
        const {
          type,
          alias = null,
          exclude_exceptions: excludeExceptions = true,
          chunk_size: chunkSize = 10,
        } = request.body;
        if (type === 'exception_list_ids') {
          const listIds = request.body.exception_list_ids.map(
            ({ exception_list_id: listId }) => listId
          );
          const namespaceTypes = request.body.exception_list_ids.map(
            ({ namespace_type: namespaceType }) => namespaceType
          );

          // Stream the results from the Point In Time (PIT) finder into this array
          let items: ExceptionListItemSchema[] = [];
          const executeFunctionOnStream = (responseBody: FoundExceptionListItemSchema): void => {
            items = [...items, ...responseBody.data];
          };

          await exceptionListClient?.findExceptionListsItemPointInTimeFinder({
            executeFunctionOnStream,
            filter: [],
            listId: listIds,
            maxSize: undefined, // NOTE: This is unbounded when it is "undefined"
            namespaceType: namespaceTypes,
            perPage: 1_000, // See https://github.com/elastic/kibana/issues/93770 for choice of 1k
            sortField: undefined,
            sortOrder: undefined,
          });
          exceptionItems.push(...items);
        } else {
          const { exceptions } = request.body;
          exceptionItems.push(...exceptions);
        }

        const { filter } = await buildExceptionFilter({
          alias,
          chunkSize,
          excludeExceptions,
          listClient,
          lists: exceptionItems,
        });

        return response.ok({ body: { filter } ?? {} });
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
