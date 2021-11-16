/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Readable } from 'stream';
import { chunk } from 'lodash/fp';

import { schema } from '@kbn/config-schema';
import { transformError } from '@kbn/securitysolution-es-utils';
import { createPromiseFromStreams } from '@kbn/utils';
import {
  ImportExceptionListItemSchemaDecoded,
  ImportExceptionListSchemaDecoded,
  importExceptionsResponseSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import { EXCEPTION_LIST_URL } from '@kbn/securitysolution-list-constants';
import { validate } from '@kbn/securitysolution-io-ts-utils';
import { ImportQuerySchemaDecoded, importQuerySchema } from '@kbn/securitysolution-io-ts-types';

import type { ListsPluginRouter } from '../types';
import { ConfigType } from '../config';
import { buildRouteValidation, buildSiemResponse, getExceptionListClient } from './utils';
import {
  createRulesStreamFromNdJson,
  getTupleErrorsAndUniqueExceptionListItems,
  getTupleErrorsAndUniqueExceptionLists,
  importExceptionListItems,
  importExceptionLists,
} from './utils/import_exceptions_utils';

interface HapiReadableStream extends Readable {
  hapi: {
    filename: string;
  };
}
interface PromiseFromStreams {
  lists: Array<ImportExceptionListSchemaDecoded | Error>;
  items: Array<ImportExceptionListItemSchemaDecoded | Error>;
}

const CHUNK_PARSED_OBJECT_SIZE = 50;

export const importExceptionListRoute = (router: ListsPluginRouter, config: ConfigType): void => {
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
        // validation of import and sorting of lists and items
        const readStream = createRulesStreamFromNdJson(config.maxExceptionsImportSize);
        const [parsedObjects] = await createPromiseFromStreams<PromiseFromStreams[]>([
          request.body.file as HapiReadableStream,
          ...readStream,
        ]);

        // removal of duplicates
        const [exceptionListDuplicateErrors, uniqueExceptionLists] =
          getTupleErrorsAndUniqueExceptionLists(parsedObjects.lists);
        const [exceptionListItemsDuplicateErrors, uniqueExceptionListItems] =
          getTupleErrorsAndUniqueExceptionListItems(parsedObjects.items);

        // chunking of validated import stream
        const chunkParsedListObjects = chunk(CHUNK_PARSED_OBJECT_SIZE, uniqueExceptionLists);
        const chunkParsedItemsObjects = chunk(CHUNK_PARSED_OBJECT_SIZE, uniqueExceptionListItems);

        // where the magic happens
        const importExceptionListsResponse = await importExceptionLists({
          exceptionListsClient,
          isOverwrite: request.query.overwrite,
          listsChunks: chunkParsedListObjects,
        });
        const importExceptionListItemsResponse = await importExceptionListItems({
          exceptionListsClient,
          isOverwrite: request.query.overwrite,
          itemsChunks: chunkParsedItemsObjects,
        });

        const importsSummary = {
          errors_exception_list_items: [
            ...importExceptionListItemsResponse.errors,
            ...exceptionListItemsDuplicateErrors,
          ],
          errors_exception_lists: [
            ...importExceptionListsResponse.errors,
            ...exceptionListDuplicateErrors,
          ],
          success_count_exception_list_items: importExceptionListItemsResponse.success_count,
          success_count_exception_lists: importExceptionListsResponse.success_count,
          success_exception_list_items:
            importExceptionListItemsResponse.errors.length === 0 &&
            exceptionListItemsDuplicateErrors.length === 0,
          success_exception_lists:
            importExceptionListsResponse.errors.length === 0 &&
            exceptionListDuplicateErrors.length === 0,
        };

        const [validated, errors] = validate(
          {
            ...importsSummary,
            errors: [
              ...importsSummary.errors_exception_list_items,
              ...importsSummary.errors_exception_lists,
            ],
            success:
              importsSummary.success_exception_list_items && importsSummary.success_exception_lists,
            success_count:
              importsSummary.success_count_exception_lists +
              importsSummary.success_count_exception_list_items,
          },
          importExceptionsResponseSchema
        );

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
