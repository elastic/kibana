/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { extname } from 'path';

import { schema } from '@kbn/config-schema';
import { transformError } from '@kbn/securitysolution-es-utils';
import { importExceptionsResponseSchema } from '@kbn/securitysolution-io-ts-list-types';
import { EXCEPTION_LIST_URL } from '@kbn/securitysolution-list-constants';
import { validate } from '@kbn/securitysolution-io-ts-utils';
import { ImportQuerySchemaDecoded, importQuerySchema } from '@kbn/securitysolution-io-ts-types';

import type { ListsPluginRouter } from '../types';
import { ConfigType } from '../config';

import { buildRouteValidation, buildSiemResponse, getExceptionListClient } from './utils';

/**
 * Takes an ndjson file of exception lists and exception list items and
 * imports them by either creating or updating lists/items given a clients
 * choice to overwrite any matching lists
 */
export const importExceptionsRoute = (router: ListsPluginRouter, config: ConfigType): void => {
  router.post(
    {
      options: {
        body: {
          maxBytes: config.maxImportPayloadBytes,
          output: 'stream',
        },
        tags: ['access:lists-all'],
      },
      path: `${EXCEPTION_LIST_URL}/_import`,
      validate: {
        body: schema.any(), // validation on file object is accomplished later in the handler.
        query: buildRouteValidation<typeof importQuerySchema, ImportQuerySchemaDecoded>(
          importQuerySchema
        ),
      },
    },
    async (context, request, response) => {
      const exceptionListsClient = getExceptionListClient(context);
      const siemResponse = buildSiemResponse(response);

      try {
        const { filename } = request.body.file.hapi;
        const fileExtension = extname(filename).toLowerCase();
        if (fileExtension !== '.ndjson') {
          return siemResponse.error({
            body: `Invalid file extension ${fileExtension}`,
            statusCode: 400,
          });
        }

        const importsSummary = await exceptionListsClient.importExceptionListAndItems({
          exceptionsToImport: request.body.file,
          maxExceptionsImportSize: config.maxExceptionsImportSize,
          overwrite: request.query.overwrite,
        });

        const [validated, errors] = validate(importsSummary, importExceptionsResponseSchema);

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
