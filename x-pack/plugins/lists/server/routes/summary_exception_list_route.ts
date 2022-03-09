/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validate } from '@kbn/securitysolution-io-ts-utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import {
  SummaryExceptionListSchemaDecoded,
  exceptionListSummarySchema,
  summaryExceptionListSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import { EXCEPTION_LIST_URL } from '@kbn/securitysolution-list-constants';

import type { ListsPluginRouter } from '../types';

import {
  buildRouteValidation,
  buildSiemResponse,
  getErrorMessageExceptionList,
  getExceptionListClient,
} from './utils';

export const summaryExceptionListRoute = (router: ListsPluginRouter): void => {
  router.get(
    {
      options: {
        tags: ['access:lists-summary'],
      },
      path: `${EXCEPTION_LIST_URL}/summary`,
      validate: {
        query: buildRouteValidation<
          typeof summaryExceptionListSchema,
          SummaryExceptionListSchemaDecoded
        >(summaryExceptionListSchema),
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      try {
        const { id, list_id: listId, namespace_type: namespaceType, filter } = request.query;
        const exceptionLists = getExceptionListClient(context);
        if (id != null || listId != null) {
          const exceptionListSummary = await exceptionLists.getExceptionListSummary({
            filter,
            id,
            listId,
            namespaceType,
          });
          if (exceptionListSummary == null) {
            return siemResponse.error({
              body: getErrorMessageExceptionList({ id, listId }),
              statusCode: 404,
            });
          } else {
            const [validated, errors] = validate(exceptionListSummary, exceptionListSummarySchema);
            if (errors != null) {
              return response.ok({ body: exceptionListSummary });
            } else {
              return response.ok({ body: validated ?? {} });
            }
          }
        } else {
          return siemResponse.error({ body: 'id or list_id required', statusCode: 400 });
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
