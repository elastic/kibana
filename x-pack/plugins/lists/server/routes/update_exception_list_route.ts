/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validate } from '@kbn/securitysolution-io-ts-utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import {
  UpdateExceptionListSchemaDecoded,
  exceptionListSchema,
  updateExceptionListSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import { EXCEPTION_LIST_URL } from '@kbn/securitysolution-list-constants';

import type { ListsPluginRouter } from '../types';

import {
  buildRouteValidation,
  buildSiemResponse,
  getErrorMessageExceptionList,
  getExceptionListClient,
} from './utils';

export const updateExceptionListRoute = (router: ListsPluginRouter): void => {
  router.put(
    {
      options: {
        tags: ['access:lists-all'],
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
          _version,
          tags,
          name,
          description,
          id,
          list_id: listId,
          meta,
          namespace_type: namespaceType,
          os_types: osTypes,
          type,
          version,
        } = request.body;
        const exceptionLists = await getExceptionListClient(context);
        if (id == null && listId == null) {
          return siemResponse.error({
            body: 'either id or list_id need to be defined',
            statusCode: 404,
          });
        } else {
          const list = await exceptionLists.updateExceptionList({
            _version,
            description,
            id,
            listId,
            meta,
            name,
            namespaceType,
            osTypes,
            tags,
            type,
            version,
          });
          if (list == null) {
            return siemResponse.error({
              body: getErrorMessageExceptionList({ id, listId }),
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
