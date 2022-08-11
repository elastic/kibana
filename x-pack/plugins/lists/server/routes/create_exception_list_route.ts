/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validate } from '@kbn/securitysolution-io-ts-utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import {
  CreateExceptionListSchemaDecoded,
  createExceptionListSchema,
  exceptionListSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import { EXCEPTION_LIST_URL } from '@kbn/securitysolution-list-constants';

import type { ListsPluginRouter } from '../types';

import { buildRouteValidation, buildSiemResponse } from './utils';
import { getExceptionListClient } from './utils/get_exception_list_client';

export const createExceptionListRoute = (router: ListsPluginRouter): void => {
  router.post(
    {
      options: {
        tags: ['access:lists-all'],
      },
      path: EXCEPTION_LIST_URL,
      validate: {
        body: buildRouteValidation<
          typeof createExceptionListSchema,
          CreateExceptionListSchemaDecoded
        >(createExceptionListSchema),
      },
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
          list_id: listId,
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
        } else {
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
          const [validated, errors] = validate(createdList, exceptionListSchema);
          if (errors != null) {
            return siemResponse.error({ body: errors, statusCode: 500 });
          } else {
            return response.ok({ body: validated ?? {} });
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
