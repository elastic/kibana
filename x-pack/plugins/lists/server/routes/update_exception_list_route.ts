/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import { EXCEPTION_LIST_URL } from '@kbn/securitysolution-list-constants';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import {
  UpdateExceptionListRequestBody,
  UpdateExceptionListResponse,
} from '@kbn/securitysolution-exceptions-common/api';

import type { ListsPluginRouter } from '../types';

import { buildSiemResponse, getErrorMessageExceptionList, getExceptionListClient } from './utils';

export const updateExceptionListRoute = (router: ListsPluginRouter): void => {
  router.versioned
    .put({
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
            body: buildRouteValidationWithZod(UpdateExceptionListRequestBody),
          },
        },
        version: '2023-10-31',
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
          }

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
          }

          return response.ok({ body: UpdateExceptionListResponse.parse(list) });
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
