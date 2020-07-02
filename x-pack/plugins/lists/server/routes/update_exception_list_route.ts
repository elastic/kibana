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
  UpdateExceptionListSchemaDecoded,
  exceptionListSchema,
  updateExceptionListSchema,
} from '../../common/schemas';

import { getExceptionListClient } from './utils';

export const updateExceptionListRoute = (router: IRouter): void => {
  router.put(
    {
      options: {
        tags: ['access:lists'],
      },
      path: EXCEPTION_LIST_URL,
      validate: {
        body: buildRouteValidation<
          typeof updateExceptionListSchema,
          UpdateExceptionListSchemaDecoded
        >(updateExceptionListSchema),
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      try {
        const {
          _tags,
          tags,
          name,
          description,
          id,
          list_id: listId,
          meta,
          namespace_type: namespaceType,
          type,
        } = request.body;
        const exceptionLists = getExceptionListClient(context);
        if (id == null && listId == null) {
          return siemResponse.error({
            body: `either id or list_id need to be defined`,
            statusCode: 404,
          });
        } else {
          const list = await exceptionLists.updateExceptionList({
            _tags,
            description,
            id,
            listId,
            meta,
            name,
            namespaceType,
            tags,
            type,
          });
          if (list == null) {
            return siemResponse.error({
              body: `exception list id: "${id}" found found`,
              statusCode: 404,
            });
          } else {
            const [validated, errors] = validate(list, exceptionListSchema);
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
