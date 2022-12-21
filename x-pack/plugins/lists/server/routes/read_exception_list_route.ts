/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validate } from '@kbn/securitysolution-io-ts-utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import {
  ReadExceptionListSchemaDecoded,
  exceptionListSchema,
  readExceptionListSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import { EXCEPTION_LIST_URL } from '@kbn/securitysolution-list-constants';

import type { ListsPluginRouter } from '../types';

import {
  buildRouteValidation,
  buildSiemResponse,
  getErrorMessageExceptionList,
  getExceptionListClient,
} from './utils';

export const readExceptionListRoute = (router: ListsPluginRouter): void => {
  router.get(
    {
      options: {
        tags: ['access:lists-read'],
      },
      path: EXCEPTION_LIST_URL,
      validate: {
        query: buildRouteValidation<typeof readExceptionListSchema, ReadExceptionListSchemaDecoded>(
          readExceptionListSchema
        ),
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      try {
        const { id, list_id: listId, namespace_type: namespaceType } = request.query;
        const exceptionLists = await getExceptionListClient(context);
        if (id != null || listId != null) {
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
          } else {
            const [validated, errors] = validate(exceptionList, exceptionListSchema);
            if (errors != null) {
              return siemResponse.error({ body: errors, statusCode: 500 });
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
