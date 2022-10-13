/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Readable } from 'stream';

import {
  BulkErrorSchema,
  ImportExceptionListItemSchema,
  ImportExceptionListItemSchemaDecoded,
  ImportExceptionListSchemaDecoded,
  ImportExceptionsListSchema,
  ImportExceptionsResponseSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import { createPromiseFromStreams } from '@kbn/utils';
import { SavedObjectsClientContract } from '@kbn/core/server';
import { chunk } from 'lodash/fp';

import { importExceptionLists } from './utils/import/import_exception_lists';
import { importExceptionListItems } from './utils/import/import_exception_list_items';
import { getTupleErrorsAndUniqueExceptionLists } from './utils/import/dedupe_incoming_lists';
import { getTupleErrorsAndUniqueExceptionListItems } from './utils/import/dedupe_incoming_items';
import { createExceptionsStreamFromNdjson } from './utils/import/create_exceptions_stream_logic';

export interface PromiseFromStreams {
  lists: Array<ImportExceptionListSchemaDecoded | Error>;
  items: Array<ImportExceptionListItemSchemaDecoded | Error>;
}
export interface ImportExceptionsOk {
  id?: string;
  item_id?: string;
  list_id?: string;
  status_code: number;
  message?: string;
}

export type ImportResponse = ImportExceptionsOk | BulkErrorSchema;

export type PromiseStream = ImportExceptionsListSchema | ImportExceptionListItemSchema | Error;

export interface ImportDataResponse {
  success: boolean;
  success_count: number;
  errors: BulkErrorSchema[];
}
interface ImportExceptionListAndItemsOptions {
  exceptions: PromiseFromStreams;
  overwrite: boolean;
  savedObjectsClient: SavedObjectsClientContract;
  user: string;
}

interface ImportExceptionListAndItemsAsStreamOptions {
  exceptionsToImport: Readable;
  maxExceptionsImportSize: number;
  overwrite: boolean;
  savedObjectsClient: SavedObjectsClientContract;
  user: string;
}
export type ExceptionsImport = Array<ImportExceptionListItemSchema | ImportExceptionsListSchema>;

export const CHUNK_PARSED_OBJECT_SIZE = 100;

/**
 * Import exception lists parent containers and items as stream. The shape of the list and items
 * will be validated here as well.
 * @params exceptionsToImport {stream} ndjson stream of lists and items to be imported
 * @params maxExceptionsImportSize {number} the max number of lists and items to import, defaults to 10,000
 * @params overwrite {boolean} whether or not to overwrite an exception list with imported list if a matching list_id found
 * @params savedObjectsClient {object} SO client
 * @params user {string} user importing list and items
 * @return {ImportExceptionsResponseSchema} summary of imported count and errors
 */
export const importExceptionsAsStream = async ({
  exceptionsToImport,
  maxExceptionsImportSize,
  overwrite,
  savedObjectsClient,
  user,
}: ImportExceptionListAndItemsAsStreamOptions): Promise<ImportExceptionsResponseSchema> => {
  // validation of import and sorting of lists and items
  const readStream = createExceptionsStreamFromNdjson(maxExceptionsImportSize);
  const [parsedObjects] = await createPromiseFromStreams<PromiseFromStreams[]>([
    exceptionsToImport,
    ...readStream,
  ]);

  return importExceptions({
    exceptions: parsedObjects,
    overwrite,
    savedObjectsClient,
    user,
  });
};

export const importExceptions = async ({
  exceptions,
  overwrite,
  savedObjectsClient,
  user,
}: ImportExceptionListAndItemsOptions): Promise<ImportExceptionsResponseSchema> => {
  // removal of duplicates
  const [exceptionListDuplicateErrors, uniqueExceptionLists] =
    getTupleErrorsAndUniqueExceptionLists(exceptions.lists);
  const [exceptionListItemsDuplicateErrors, uniqueExceptionListItems] =
    getTupleErrorsAndUniqueExceptionListItems(exceptions.items);

  // chunking of validated import stream
  const chunkParsedListObjects = chunk(CHUNK_PARSED_OBJECT_SIZE, uniqueExceptionLists);
  const chunkParsedItemsObjects = chunk(CHUNK_PARSED_OBJECT_SIZE, uniqueExceptionListItems);

  // where the magic happens - purposely importing parent exception
  // containers first, items second
  const importExceptionListsResponse = await importExceptionLists({
    isOverwrite: overwrite,
    listsChunks: chunkParsedListObjects,
    savedObjectsClient,
    user,
  });
  const importExceptionListItemsResponse = await importExceptionListItems({
    isOverwrite: overwrite,
    itemsChunks: chunkParsedItemsObjects,
    savedObjectsClient,
    user,
  });

  const importsSummary = {
    errors: [
      ...importExceptionListsResponse.errors,
      ...exceptionListDuplicateErrors,
      ...importExceptionListItemsResponse.errors,
      ...exceptionListItemsDuplicateErrors,
    ],
    success_count_exception_list_items: importExceptionListItemsResponse.success_count,
    success_count_exception_lists: importExceptionListsResponse.success_count,
    success_exception_list_items:
      importExceptionListItemsResponse.errors.length === 0 &&
      exceptionListItemsDuplicateErrors.length === 0,
    success_exception_lists:
      importExceptionListsResponse.errors.length === 0 && exceptionListDuplicateErrors.length === 0,
  };

  return {
    ...importsSummary,
    success: importsSummary.success_exception_list_items && importsSummary.success_exception_lists,
    success_count:
      importsSummary.success_count_exception_lists +
      importsSummary.success_count_exception_list_items,
  };
};
