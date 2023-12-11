/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validate } from '@kbn/securitysolution-io-ts-utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import { EXCEPTION_LIST_URL } from '@kbn/securitysolution-list-constants';

import type { ListsPluginRouter } from '../types';
import {
  DeleteExceptionListRequestQueryDecoded,
  deleteExceptionListRequestQuery,
  deleteExceptionListResponse,
} from '../../common/api';

import {
  buildRouteValidation,
  buildSiemResponse,
  getErrorMessageExceptionList,
  getExceptionListClient,
} from './utils';

export const deleteExceptionListRoute = (router: ListsPluginRouter): void => {
  router.versioned
    .delete({
      access: 'public',
      options: {
        tags: ['access:lists-all'],
      },
      path: EXCEPTION_LIST_URL,
    })
    .addVersion(
      {
        validate: {
          request: {
            query: buildRouteValidation<
              typeof deleteExceptionListRequestQuery,
              DeleteExceptionListRequestQueryDecoded
            >(deleteExceptionListRequestQuery),
          },
        },
        version: '2023-10-31',
      },
      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);
        try {
          const exceptionLists = await getExceptionListClient(context);
          const { list_id: listId, id, namespace_type: namespaceType } = request.query;
          if (listId == null && id == null) {
            return siemResponse.error({
              body: 'Either "list_id" or "id" needs to be defined in the request',
              statusCode: 400,
            });
          } else {
            const deleted = await exceptionLists.deleteExceptionList({
              id,
              listId,
              namespaceType,
            });
            if (deleted == null) {
              return siemResponse.error({
                body: getErrorMessageExceptionList({ id, listId }),
                statusCode: 404,
              });
            } else {
              const [validated, errors] = validate(deleted, deleteExceptionListResponse);
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
