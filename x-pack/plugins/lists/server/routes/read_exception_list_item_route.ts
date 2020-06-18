/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from 'kibana/server';

import { EXCEPTION_LIST_ITEM_URL } from '../../common/constants';
import { buildRouteValidation, buildSiemResponse, transformError } from '../siem_server_deps';
import { validate } from '../../common/siem_common_deps';
import {
  ReadExceptionListItemSchemaDecoded,
  exceptionListItemSchema,
  readExceptionListItemSchema,
} from '../../common/schemas';

import { getErrorMessageExceptionListItem, getExceptionListClient } from './utils';

export const readExceptionListItemRoute = (router: IRouter): void => {
  router.get(
    {
      options: {
        tags: ['access:lists'],
      },
      path: EXCEPTION_LIST_ITEM_URL,
      validate: {
        query: buildRouteValidation<
          typeof readExceptionListItemSchema,
          ReadExceptionListItemSchemaDecoded
        >(readExceptionListItemSchema),
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      try {
        const { id, item_id: itemId, namespace_type: namespaceType } = request.query;
        const exceptionLists = getExceptionListClient(context);
        if (id != null || itemId != null) {
          const exceptionListItem = await exceptionLists.getExceptionListItem({
            id,
            itemId,
            namespaceType,
          });
          if (exceptionListItem == null) {
            return siemResponse.error({
              body: getErrorMessageExceptionListItem({ id, itemId }),
              statusCode: 404,
            });
          } else {
            const [validated, errors] = validate(exceptionListItem, exceptionListItemSchema);
            if (errors != null) {
              return siemResponse.error({ body: errors, statusCode: 500 });
            } else {
              return response.ok({ body: validated ?? {} });
            }
          }
        } else {
          return siemResponse.error({ body: 'id or item_id required', statusCode: 400 });
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
