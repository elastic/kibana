/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { transformError } from '@kbn/securitysolution-es-utils';
import { EXCEPTION_LIST_URL } from '@kbn/securitysolution-list-constants';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import {
  CreateExceptionListRequestBody,
  CreateExceptionListResponse,
} from '@kbn/securitysolution-exceptions-common/api';

import type { ListsPluginRouter } from '../types';

import { buildSiemResponse, getExceptionListClient } from './utils';

export const createExceptionListRoute = (router: ListsPluginRouter): void => {
  router.versioned
    .post({
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
            body: buildRouteValidationWithZod(CreateExceptionListRequestBody),
          },
        },
        version: '2023-10-31',
      },
      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);
        try {
          const {
            name,
            tags,
            meta,
            namespace_type: namespaceType,
            description,
            list_id: listId = uuidv4(),
            type,
            version,
          } = request.body;
          const exceptionLists = await getExceptionListClient(context);
          const exceptionList = await exceptionLists.getExceptionList({
            id: undefined,
            listId,
            namespaceType,
          });

          if (exceptionList != null) {
            return siemResponse.error({
              body: `exception list id: "${listId}" already exists`,
              statusCode: 409,
            });
          }

          const createdList = await exceptionLists.createExceptionList({
            description,
            immutable: false,
            listId,
            meta,
            name,
            namespaceType,
            tags,
            type,
            version,
          });

          return response.ok({ body: CreateExceptionListResponse.parse(createdList) });
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
