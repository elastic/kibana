/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validate } from '@kbn/securitysolution-io-ts-utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import {
  FindExceptionListSchemaDecoded,
  findExceptionListSchema,
  foundExceptionListSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import { EXCEPTION_LIST_URL } from '@kbn/securitysolution-list-constants';

import type { ListsPluginRouter } from '../types';

import { buildRouteValidation, buildSiemResponse, getExceptionListClient } from './utils';

export const findExceptionListRoute = (router: ListsPluginRouter): void => {
  router.get(
    {
      options: {
        tags: ['access:lists-read'],
      },
      path: `${EXCEPTION_LIST_URL}/_find`,
      validate: {
        query: buildRouteValidation<typeof findExceptionListSchema, FindExceptionListSchemaDecoded>(
          findExceptionListSchema
        ),
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      try {
        const exceptionLists = getExceptionListClient(context);
        const {
          filter,
          page,
          namespace_type: namespaceType,
          per_page: perPage,
          sort_field: sortField,
          sort_order: sortOrder,
        } = request.query;
        const exceptionListItems = await exceptionLists.findExceptionList({
          filter,
          namespaceType,
          page,
          perPage,
          pit: undefined,
          searchAfter: undefined,
          sortField,
          sortOrder,
        });
        const [validated, errors] = validate(exceptionListItems, foundExceptionListSchema);
        if (errors != null) {
          return siemResponse.error({ body: errors, statusCode: 500 });
        } else {
          return response.ok({ body: validated ?? {} });
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
