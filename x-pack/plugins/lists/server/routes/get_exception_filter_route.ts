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
        const { type, alias = null, excludeExceptions = true, chunkSize = 1024 } = request.body;
        if (type === 'exceptionListIds') {
          for await (const { exceptionListId, namespaceType } of request.body.exceptionListIds) {
            const exceptionList = await exceptionListClient?.findExceptionListItem({
              filter: undefined,
              listId: exceptionListId,
              namespaceType,
              page: undefined,
              perPage: undefined,
              sortField: undefined,
              sortOrder: undefined,
            });
            if (!exceptionList) {
              return siemResponse.error({
                body: `Cannot find exception list: ${exceptionListId}`,
                statusCode: 500,
              });
            }
            exceptionItems.push(...exceptionList.data);
          }
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

        return response.ok({ body: filter ?? {} });
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
