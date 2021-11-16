/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

import { Transform } from 'stream';
import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { has } from 'lodash/fp';

import {
  BulkErrorSchema,
  ExportExceptionDetails,
  ImportExceptionListItemSchema,
  ImportExceptionListItemSchemaDecoded,
  ImportExceptionListSchemaDecoded,
  ImportExceptionsListSchema,
  importExceptionListItemSchema,
  importExceptionsListSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import {
  createConcatStream,
  createFilterStream,
  createMapStream,
  createReduceStream,
  createSplitStream,
} from '@kbn/utils';
import { exactCheck, formatErrors } from '@kbn/securitysolution-io-ts-utils';
import { BadRequestError } from '@kbn/securitysolution-es-utils';

import uuid from 'uuid';
import { ExceptionListClient } from '../../services/exception_lists/exception_list_client';

export interface ImportExceptionListsOk {
  list_id: string;
  status_code: number;
  message?: string;
}

export type ImportListsResponse = ImportExceptionListsOk | BulkErrorSchema;

export interface ImportExceptionListItemsOk {
  item_id: string;
  list_id: string;
  status_code: number;
  message?: string;
}

export type ImportItemsResponse = ImportExceptionListItemsOk | BulkErrorSchema;

export type PromiseStream = ImportExceptionsListSchema | ImportExceptionListItemSchema | Error;

export interface ImportDataResponse {
  success: boolean;
  success_count: number;
  errors: BulkErrorSchema[];
}

export const isImportRegular = (
  importRuleResponse: ImportItemsResponse | ImportListsResponse
): importRuleResponse is ImportExceptionListItemsOk => {
  return !has('error', importRuleResponse) && has('status_code', importRuleResponse);
};

/**
 * Validates exception lists and items schemas
 */
export const validateExceptionsStream = (): Transform => {
  return createMapStream<{
    items: Array<ImportExceptionListItemSchema | Error>;
    lists: Array<ImportExceptionsListSchema | Error>;
  }>((exceptions) => ({
    items: validateExceptionsItems(exceptions.items),
    lists: validateExceptionsLists(exceptions.lists),
  }));
};

/**
 * Validates imported exception lists schemas
 */
export const validateExceptionsLists = (
  lists: Array<ImportExceptionsListSchema | Error>
): Array<ImportExceptionListSchemaDecoded | Error> => {
  const onLeft = (errors: t.Errors): BadRequestError | ImportExceptionListSchemaDecoded => {
    return new BadRequestError(formatErrors(errors).join());
  };
  const onRight = (
    schemaList: ImportExceptionsListSchema
  ): BadRequestError | ImportExceptionListSchemaDecoded => {
    return schemaList as ImportExceptionListSchemaDecoded;
  };

  return lists.map((obj: ImportExceptionsListSchema | Error) => {
    if (!(obj instanceof Error)) {
      const decodedList = importExceptionsListSchema.decode(obj);
      const checkedList = exactCheck(obj, decodedList);

      return pipe(checkedList, fold(onLeft, onRight));
    } else {
      return obj;
    }
  });
};

/**
 * Validates imported exception list items schemas
 */
export const validateExceptionsItems = (
  items: Array<ImportExceptionListItemSchema | Error>
): Array<ImportExceptionListItemSchemaDecoded | Error> => {
  const onLeft = (errors: t.Errors): BadRequestError | ImportExceptionListItemSchemaDecoded => {
    return new BadRequestError(formatErrors(errors).join());
  };
  const onRight = (
    itemSchema: ImportExceptionListItemSchema
  ): BadRequestError | ImportExceptionListItemSchemaDecoded => {
    return itemSchema as ImportExceptionListItemSchemaDecoded;
  };

  return items.map((item: ImportExceptionListItemSchema | Error) => {
    if (!(item instanceof Error)) {
      const decodedItem = importExceptionListItemSchema.decode(item);
      const checkedItem = exactCheck(item, decodedItem);

      return pipe(checkedItem, fold(onLeft, onRight));
    } else {
      return item;
    }
  });
};

/**
 * Filters out empty strings from ndjson stream
 */
export const filterEmptyStrings = (): Transform => {
  return createFilterStream<string>((ndJsonStr) => ndJsonStr.trim() !== '');
};

/**
 * Parses strings from ndjson stream
 */
export const parseNdjsonStrings = (): Transform => {
  return createMapStream((ndJsonStr: string): Transform => {
    try {
      return JSON.parse(ndJsonStr);
    } catch (err) {
      return err;
    }
  });
};

/**
 * Filters out the counts metadata added on export
 */
export const filterExportedCounts = (): Transform => {
  return createFilterStream<
    ImportExceptionListSchemaDecoded | ImportExceptionListItemSchemaDecoded | ExportExceptionDetails
  >((obj) => obj != null && !has('exported_exception_list_count', obj));
};

/**
 * Sorts the exceptions into the lists and items.
 * We do this because we don't want the order of the exceptions
 * in the import to matter. If we didn't sort, then some items
 * might error if the list has not yet been created
 */
export const sortExceptions = (): Transform => {
  return createReduceStream<{
    items: Array<ImportExceptionListItemSchema | Error>;
    lists: Array<ImportExceptionsListSchema | Error>;
  }>(
    (acc, exception) => {
      if (has('entries', exception) || has('item_id', exception)) {
        return { ...acc, items: [...acc.items, exception] };
      } else {
        return { ...acc, lists: [...acc.lists, exception] };
      }
    },
    {
      items: [],
      lists: [],
    }
  );
};

// Adaptation from: saved_objects/import/create_limit_stream.ts
export const createLimitStream = (limit: number): Transform => {
  let counter = 0;
  return new Transform({
    objectMode: true,
    async transform(obj, _, done): Promise<void> {
      if (counter >= limit) {
        done(new Error(`Can't import more than ${limit} exceptions`));
      } else {
        counter++;
        done(undefined, obj);
      }
    },
  });
};

/**
 * Inspiration and the pattern of code followed is from:
 * saved_objects/lib/create_saved_objects_stream_from_ndjson.ts
 */
export const createRulesStreamFromNdJson = (exceptionsLimit: number): Transform[] => {
  return [
    createSplitStream('\n'),
    filterEmptyStrings(),
    parseNdjsonStrings(),
    filterExportedCounts(),
    sortExceptions(),
    validateExceptionsStream(),
    createLimitStream(exceptionsLimit),
    createConcatStream([]),
  ];
};

/**
 * Reports on duplicates and returns unique array of lists
 * @param lists - exception lists to be checked for duplicate list_ids
 * @returns {Array} tuple of duplicate errors and unique lists
 */
export const getTupleErrorsAndUniqueExceptionLists = (
  lists: Array<ImportExceptionListSchemaDecoded | Error>
): [BulkErrorSchema[], ImportExceptionListSchemaDecoded[]] => {
  const { errors, listsAcc } = lists.reduce(
    (acc, parsedExceptionList) => {
      if (parsedExceptionList instanceof Error) {
        acc.errors.set(uuid.v4(), {
          error: {
            message: `Error found importing exception list: ${parsedExceptionList.message}`,
            status_code: 400,
          },
          list_id: '(unknown list_id)',
        });
      } else {
        const { list_id: listId } = parsedExceptionList;
        if (acc.listsAcc.has(listId)) {
          acc.errors.set(uuid.v4(), {
            error: {
              message: `More than one exception list with list_id: "${listId}" found in imports. The last list will be used.`,
              status_code: 400,
            },
            list_id: listId,
          });
        }
        acc.listsAcc.set(listId, parsedExceptionList);
      }

      return acc;
    }, // using map (preserves ordering)
    {
      errors: new Map<string, BulkErrorSchema>(),
      listsAcc: new Map<string, ImportExceptionListSchemaDecoded>(),
    }
  );

  return [Array.from(errors.values()), Array.from(listsAcc.values())];
};

/**
 * Reports on duplicates and returns unique array of items
 * @param items - exception items to be checked for duplicate list_ids
 * @returns {Array} tuple of errors and unique items
 */
export const getTupleErrorsAndUniqueExceptionListItems = (
  items: Array<ImportExceptionListItemSchemaDecoded | Error>
): [BulkErrorSchema[], ImportExceptionListItemSchemaDecoded[]] => {
  const { errors, itemsAcc } = items.reduce(
    (acc, parsedExceptionItem) => {
      if (parsedExceptionItem instanceof Error) {
        acc.errors.set(uuid.v4(), {
          error: {
            message: `Error found importing exception list item: ${parsedExceptionItem.message}`,
            status_code: 400,
          },
          list_id: '(unknown item_id)',
        });
      } else {
        const { item_id: itemId, list_id: listId } = parsedExceptionItem;
        if (acc.itemsAcc.has(`${itemId}${listId}`)) {
          acc.errors.set(uuid.v4(), {
            error: {
              message: `More than one exception list item with item_id: "${itemId}" found in imports. The last item will be used.`,
              status_code: 400,
            },
            item_id: itemId,
          });
        }
        acc.itemsAcc.set(`${itemId}${listId}`, parsedExceptionItem);
      }

      return acc;
    }, // using map (preserves ordering)
    {
      errors: new Map<string, BulkErrorSchema>(),
      itemsAcc: new Map<string, ImportExceptionListItemSchemaDecoded>(),
    }
  );

  return [Array.from(errors.values()), Array.from(itemsAcc.values())];
};

/**
 * Helper with logic determining when to create or update on exception list import
 * @param exceptionListsClient - exceptions client
 * @param listsChunks - exception lists being imported
 * @param isOverwrite - if matching lis_id found, should list be overwritten
 * @returns {Object} returns counts of successful imports and any errors found
 */
export const importExceptionLists = async ({
  exceptionListsClient,
  listsChunks,
  isOverwrite,
}: {
  exceptionListsClient: ExceptionListClient;
  listsChunks: ImportExceptionListSchemaDecoded[][];
  isOverwrite: boolean;
}): Promise<ImportDataResponse> => {
  let importExceptionListsResponse: ImportListsResponse[] = [];

  while (listsChunks.length) {
    const batchParseObjects = listsChunks.shift() ?? [];
    const newImportRuleResponse = await Promise.all(
      batchParseObjects.reduce<Array<Promise<ImportListsResponse>>>(
        (accum, parsedExceptionList) => {
          const importsWorkerPromise = new Promise<ImportListsResponse>(
            async (resolve, reject): Promise<void> => {
              try {
                const {
                  description,
                  meta,
                  list_id: listId,
                  name,
                  namespace_type: namespaceType,
                  tags,
                  type,
                  version,
                } = parsedExceptionList;
                try {
                  const list = await exceptionListsClient.getExceptionList({
                    id: undefined,
                    listId,
                    namespaceType,
                  });

                  if (list == null) {
                    await exceptionListsClient.createExceptionList({
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
                    resolve({
                      list_id: listId,
                      status_code: 200,
                    });
                  } else if (list != null && isOverwrite) {
                    // If overwrite is true, assume user wants to overwrite
                    // entire list and items, so first need to clean up both
                    await exceptionListsClient.deleteExceptionList({
                      id: undefined,
                      listId,
                      namespaceType,
                    });

                    // Create list anew and items will be attached to it
                    await exceptionListsClient.createExceptionList({
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
                    resolve({
                      list_id: listId,
                      status_code: 200,
                    });
                  } else if (list != null) {
                    resolve({
                      error: {
                        message: `list_id: "${listId}" already exists`,
                        status_code: 409,
                      },
                      list_id: listId,
                    });
                  }
                } catch (err) {
                  resolve({
                    error: {
                      message: err.message,
                      status_code: err.statusCode ?? 400,
                    },
                    list_id: listId,
                  });
                }
              } catch (error) {
                reject(error);
              }
            }
          );
          return [...accum, importsWorkerPromise];
        },
        []
      )
    );
    importExceptionListsResponse = [...importExceptionListsResponse, ...newImportRuleResponse];
  }

  const errorsResp = importExceptionListsResponse.filter((resp) =>
    has('error', resp)
  ) as BulkErrorSchema[];
  const successes = importExceptionListsResponse.filter((resp) => {
    if (isImportRegular(resp)) {
      return resp.status_code === 200;
    } else {
      return false;
    }
  });
  return {
    errors: errorsResp,
    success: errorsResp.length === 0,
    success_count: successes.length,
  };
};

/**
 * Creates promises of the exceptions to be exported and returns them.
 * @param exceptionsListClient Exception Lists client
 * @param exceptions The exceptions to be exported
 * @returns Promise of export ready exceptions.
 */
export const createPromises = (
  exceptionsListClient: ExceptionListClient,
  itemChunk: ImportExceptionListItemSchemaDecoded,
  isOverwrite: boolean,
  resp: ImportItemsResponse[]
): Promise<ImportItemsResponse[]> =>
  new Promise(async (resolve, reject) => {
    try {
      const {
        comments,
        description,
        entries,
        item_id: itemId,
        list_id: listId,
        meta,
        name,
        namespace_type: namespaceType,
        os_types: osTypes,
        tags,
        type,
      } = itemChunk;

      try {
        const item = await exceptionsListClient.getExceptionListItem({
          id: undefined,
          itemId,
          namespaceType,
        });

        if (item == null) {
          await exceptionsListClient.createExceptionListItem({
            comments,
            description,
            entries,
            itemId,
            listId,
            meta,
            name,
            namespaceType,
            osTypes,
            tags,
            type,
          });

          resolve([
            ...resp,
            {
              item_id: itemId,
              list_id: listId,
              status_code: 200,
            },
          ]);
        } else if (item != null && isOverwrite) {
          // If overwrite is true, the list parent container is deleted first along
          // with its items, so to get here would mean the user hit a bit of an odd scenario.
          // Sample scenario would be as follows:
          // In system we have:
          // List A ---> with item list_item_id
          // Import is:
          // List A ---> with item list_item_id_1
          // List B ---> with item list_item_id_1
          // If we just did an update of the item, we would overwrite
          // list_item_id_1 of List A, which would be weird behavior
          // What happens:
          // List A and items are deleted and recreated
          // List B is created, but list_item_id_1 already exists under List A and user warned
          resolve([
            ...resp,
            {
              error: {
                message: `Error trying to update item_id: "${itemId}". The item already exists under list_id: ${item.list_id}`,
                status_code: 409,
              },
              item_id: itemId,
              list_id: listId,
            },
          ]);
        } else if (item != null) {
          resolve([
            ...resp,
            {
              error: {
                message: `item_id: "${itemId}" already exists`,
                status_code: 409,
              },
              item_id: itemId,
              list_id: listId,
            },
          ]);
        }
      } catch (err) {
        resolve([
          ...resp,
          {
            error: {
              message: err.message,
              status_code: err.statusCode ?? 400,
            },
            item_id: itemId,
            list_id: listId,
          },
        ]);
      }
    } catch (error) {
      reject(error);
    }
  });

/**
 * Helper with logic determining when to create or update on exception list items import
 * @param exceptionListsClient - exceptions client
 * @param itemsChunks - exception list items being imported
 * @param isOverwrite - if matching item_id found, should item be overwritten
 * @returns {Object} returns counts of successful imports and any errors found
 */
export const importExceptionListItems = async ({
  exceptionListsClient,
  itemsChunks,
  isOverwrite,
}: {
  exceptionListsClient: ExceptionListClient;
  itemsChunks: ImportExceptionListItemSchemaDecoded[][];
  isOverwrite: boolean;
}): Promise<ImportDataResponse> => {
  let importExceptionListItemsResponse: ImportItemsResponse[] = [];

  for await (const itemsChunk of itemsChunks) {
    const b = await itemsChunk.reduce<Promise<ImportItemsResponse[]>>((previousPromise, chunk) => {
      return previousPromise.then((resp) => {
        return createPromises(exceptionListsClient, chunk, isOverwrite, resp);
      });
    }, Promise.resolve([]));

    importExceptionListItemsResponse = [...importExceptionListItemsResponse, ...b];
  }

  const errorsResp = importExceptionListItemsResponse.filter((resp) =>
    has('error', resp)
  ) as BulkErrorSchema[];
  const successes = importExceptionListItemsResponse.filter((resp) => {
    if (isImportRegular(resp)) {
      return resp.status_code === 200;
    } else {
      return false;
    }
  });

  return {
    errors: errorsResp,
    success: errorsResp.length === 0,
    success_count: successes.length,
  };
};
