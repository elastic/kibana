/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validate } from '@kbn/securitysolution-io-ts-utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import {
  DeleteExceptionListItemSchemaDecoded,
  deleteExceptionListItemSchema,
  exceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import { EXCEPTION_LIST_ITEM_URL } from '@kbn/securitysolution-list-constants';

import type { ListsPluginRouter } from '../types';

import {
  buildRouteValidation,
  buildSiemResponse,
  getErrorMessageExceptionListItem,
  getExceptionListClient,
} from './utils';

export const deleteExceptionListItemRoute = (router: ListsPluginRouter): void => {
  router.delete(
    {
      options: {
        tags: ['access:lists-all'],
      },
      path: EXCEPTION_LIST_ITEM_URL,
      validate: {
        query: buildRouteValidation<
          typeof deleteExceptionListItemSchema,
          DeleteExceptionListItemSchemaDecoded
        >(deleteExceptionListItemSchema),
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      try {
        const exceptionLists = await getExceptionListClient(context);
        const { item_id: itemId, id, namespace_type: namespaceType } = request.query;
        if (itemId == null && id == null) {
          return siemResponse.error({
            body: 'Either "item_id" or "id" needs to be defined in the request',
            statusCode: 400,
          });
        } else {
          const deleted = await exceptionLists.deleteExceptionListItem({
            id,
            itemId,
            namespaceType,
          });
          if (deleted == null) {
            return siemResponse.error({
              body: getErrorMessageExceptionListItem({ id, itemId }),
              statusCode: 404,
            });
          } else {
            const [validated, errors] = validate(deleted, exceptionListItemSchema);
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
