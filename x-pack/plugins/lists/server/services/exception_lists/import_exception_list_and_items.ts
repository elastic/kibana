/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ImportExceptionListItemSchemaDecoded,
  ImportExceptionListSchemaDecoded,
  ImportExceptionsResponseSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import { createPromiseFromStreams } from '@kbn/utils';
import { SavedObjectsClientContract } from 'kibana/server';
import { chunk } from 'lodash/fp';

import { HapiReadableStream } from './exception_list_client_types';
import {
  createRulesStreamFromNdJson,
  getTupleErrorsAndUniqueExceptionListItems,
  getTupleErrorsAndUniqueExceptionLists,
  importExceptionListItems,
  importExceptionLists,
} from './utils/import_exceptions_utils';

interface ImportExceptionListAndItemsOptions {
  fileToImport: HapiReadableStream;
  maxExceptionsImportSize: number;
  overwrite: boolean;
  savedObjectsClient: SavedObjectsClientContract;
  user: string;
}

interface PromiseFromStreams {
  lists: Array<ImportExceptionListSchemaDecoded | Error>;
  items: Array<ImportExceptionListItemSchemaDecoded | Error>;
}

const CHUNK_PARSED_OBJECT_SIZE = 50;

export const importExceptions = async ({
  fileToImport,
  overwrite,
  savedObjectsClient,
  maxExceptionsImportSize,
  user,
}: ImportExceptionListAndItemsOptions): Promise<ImportExceptionsResponseSchema> => {
  try {
    // validation of import and sorting of lists and items
    const readStream = createRulesStreamFromNdJson(maxExceptionsImportSize);
    const [parsedObjects] = await createPromiseFromStreams<PromiseFromStreams[]>([
      fileToImport,
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
        importExceptionListsResponse.errors.length === 0 &&
        exceptionListDuplicateErrors.length === 0,
    };

    return {
      ...importsSummary,
      success:
        importsSummary.success_exception_list_items && importsSummary.success_exception_lists,
      success_count:
        importsSummary.success_count_exception_lists +
        importsSummary.success_count_exception_list_items,
    };
  } catch (err) {
    return err;
  }
};
