/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import {
  CreateExceptionListSchemaDecoded,
  createExceptionListSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import { EXCEPTION_LIST_URL } from '@kbn/securitysolution-list-constants';

import type { ListsPluginRouter } from '../types';
import { createExceptionListHandler } from '../handlers/create_exception_list_handler';

import { buildRouteValidation, buildSiemResponse } from './utils';

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
        return await createExceptionListHandler(context, request, response, siemResponse);
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
