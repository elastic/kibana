/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from 'kibana/server';

import { EXCEPTION_LIST_URL } from '../../common/constants';
import { buildRouteValidation, buildSiemResponse, transformError } from '../siem_server_deps';
import { validate } from '../../common/siem_common_deps';
import {
  ReadExceptionListSchemaDecoded,
  exceptionListSchema,
  readExceptionListSchema,
} from '../../common/schemas';

import { getErrorMessageExceptionList, getExceptionListClient } from './utils';

export const readExceptionListRoute = (router: IRouter): void => {
  router.get(
    {
      options: {
        tags: ['access:lists'],
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
        const exceptionLists = getExceptionListClient(context);
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
