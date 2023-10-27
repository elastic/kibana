/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import {
  InternalCreateExceptionListSchemaDecoded,
  internalCreateExceptionListSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import { INTERNAL_EXCEPTIONS_LIST_ENSURE_CREATED_URL } from '@kbn/securitysolution-list-constants';

import { createExceptionListHandler } from '../../handlers/create_exception_list_handler';
import type { ListsPluginRouter } from '../../types';
import { buildRouteValidation, buildSiemResponse } from '../utils';

export const internalCreateExceptionListRoute = (router: ListsPluginRouter): void => {
  router.versioned
    .post({
      access: 'internal',
      options: {
        // Access control is set to `read` on purpose, as this route is internal and meant to
        // ensure we have lists created (if not already) for Endpoint artifacts in order to support
        // the UI. The Schema ensures that only endpoint artifact list IDs are allowed.
        tags: ['access:lists-read'],
      },
      path: INTERNAL_EXCEPTIONS_LIST_ENSURE_CREATED_URL,
    })
    .addVersion(
      {
        validate: {
          request: {
            body: buildRouteValidation<
              typeof internalCreateExceptionListSchema,
              InternalCreateExceptionListSchemaDecoded
            >(internalCreateExceptionListSchema),
          },
        },
        version: '1',
      },
      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);
        try {
          return await createExceptionListHandler(context, request, response, siemResponse, {
            ignoreExisting: true,
          });
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
