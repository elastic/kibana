/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import type { ListsPluginRouter } from '../types';
import { LIST_URL } from '../../common/constants';
import { buildRouteValidation, buildSiemResponse, transformError } from '../siem_server_deps';
import { validate } from '../../common/shared_imports';
import {
  EntriesArray,
  ExceptionListItemSchema,
  FoundExceptionListSchema,
  deleteListSchema,
  exceptionListItemSchema,
  listSchema,
} from '../../common/schemas';
import { getSavedObjectType } from '../services/exception_lists/utils';
import { ExceptionListClient } from '../services/exception_lists/exception_list_client';

import { getExceptionListClient, getListClient } from '.';

export const deleteListRoute = (router: ListsPluginRouter): void => {
  router.delete(
    {
      options: {
        tags: ['access:lists-all'],
      },
      path: LIST_URL,
      validate: {
        query: buildRouteValidation(deleteListSchema),
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      try {
        const lists = getListClient(context);
        const exceptionLists = getExceptionListClient(context);
        const { id, deleteReferences, ignoreReferences } = request.query;
        let deleteExceptionItemResponses;

        // ignoreReferences=true maintains pre-7.11 behavior of deleting value list without performing any additional checks
        if (!ignoreReferences) {
          const referencedExceptionListItems = await exceptionLists.findValueListExceptionListItems(
            {
              page: 1,
              perPage: 10000,
              sortField: undefined,
              sortOrder: undefined,
              valueListId: id,
            }
          );

          if (referencedExceptionListItems?.data?.length) {
            // deleteReferences=false to perform dry run and identify referenced exception lists/items
            if (deleteReferences) {
              // Delete referenced exception list items
              // TODO: Create deleteListItems to delete in batch
              deleteExceptionItemResponses = await Promise.all(
                referencedExceptionListItems.data.map(async (listItem) => {
                  // Ensure only the single entry is deleted as there could be a separate value list referenced that is okay to keep // TODO: Add API to delete single entry
                  // @ts-ignore inline way of verifying entry type is EntryList?
                  const remainingEntries = listItem.entries.filter((e) => e?.list?.id !== id);
                  if (remainingEntries.length === 0) {
                    // All entries reference value list specified in request, delete entire exception list item
                    return deleteExceptionListItem(exceptionLists, listItem);
                  } else {
                    // Contains more entries than just value list specified in request , patch (doesn't exist yet :) exception list item to remove entry
                    return updateExceptionListItems(exceptionLists, listItem, remainingEntries);
                  }
                })
              );
            } else {
              const referencedExceptionLists = await getReferencedExceptionLists(
                exceptionLists,
                referencedExceptionListItems.data
              );
              const refError = `Value list '${id}' is referenced in existing exception list(s)`;
              const references = referencedExceptionListItems.data.map((item) => ({
                exception_item: item,
                exception_list: referencedExceptionLists.data.find(
                  (l) => l.list_id === item.list_id
                ),
              }));

              return siemResponse.error({
                body: {
                  error: {
                    message: refError,
                    references,
                    value_list_id: id,
                  },
                },
                statusCode: 409,
              });
            }
          }
        }

        const deleted = await lists.deleteList({ id });
        if (deleted == null) {
          return siemResponse.error({
            body: `list id: "${id}" was not found`,
            statusCode: 404,
          });
        } else {
          const [validated, errors] = validate(deleted, listSchema);
          if (errors != null) {
            return siemResponse.error({ body: errors, statusCode: 500 });
          } else {
            return response.ok({
              body: validated ?? {
                deleteItemResponses: deleteExceptionItemResponses,
              },
            });
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

/**
 * Fetches ExceptionLists for given ExceptionListItems
 * @param exceptionLists ExceptionListClient
 * @param exceptionListItems ExceptionListItemSchema[]
 */
const getReferencedExceptionLists = async (
  exceptionLists: ExceptionListClient,
  exceptionListItems: ExceptionListItemSchema[]
): Promise<FoundExceptionListSchema> => {
  const filter = exceptionListItems
    .map(
      (item) =>
        `${getSavedObjectType({
          namespaceType: item.namespace_type,
        })}.attributes.list_id: ${item.list_id}`
    )
    .join(' OR ');
  return exceptionLists.findExceptionList({
    filter: `(${filter})`,
    namespaceType: ['agnostic', 'single'],
    page: 1,
    perPage: 10000,
    sortField: undefined,
    sortOrder: undefined,
  });
};

/**
 * Adapted from deleteExceptionListItemRoute
 * @param exceptionLists ExceptionListClient
 * @param listItem ExceptionListItemSchema
 */
const deleteExceptionListItem = async (
  exceptionLists: ExceptionListClient,
  listItem: ExceptionListItemSchema
): Promise<unknown> => {
  const deletedExceptionListItem = await exceptionLists.deleteExceptionListItem({
    id: listItem.id,
    itemId: listItem.item_id,
    namespaceType: listItem.namespace_type,
  });
  if (deletedExceptionListItem == null) {
    return {
      body: `list item with id: "${listItem.id}" not found`,
      statusCode: 404,
    };
  } else {
    const [validated, errors] = validate(deletedExceptionListItem, exceptionListItemSchema);
    if (errors != null) {
      return { body: errors, statusCode: 500 };
    } else {
      return { body: validated ?? {} };
    }
  }
};

/**
 * Adapted from updateExceptionListItemRoute
 * @param exceptionLists ExceptionListClient
 * @param listItem ExceptionListItemSchema
 * @param remainingEntries EntriesArray
 */
const updateExceptionListItems = async (
  exceptionLists: ExceptionListClient,
  listItem: ExceptionListItemSchema,
  remainingEntries: EntriesArray
): Promise<unknown> => {
  const updateExceptionListItem = await exceptionLists.updateExceptionListItem({
    _version: listItem._version,
    comments: listItem.comments,
    description: listItem.description,
    entries: remainingEntries,
    id: listItem.id,
    itemId: listItem.item_id,
    meta: listItem.meta,
    name: listItem.name,
    namespaceType: listItem.namespace_type,
    osTypes: listItem.os_types,
    tags: listItem.tags,
    type: listItem.type,
  });
  if (updateExceptionListItem == null) {
    return {
      body: `exception list item id: "${listItem.item_id}" does not exist`,
      statusCode: 404,
    };
  } else {
    const [validated, errors] = validate(updateExceptionListItem, exceptionListItemSchema);
    if (errors != null) {
      return { body: errors, statusCode: 500 };
    } else {
      return { body: validated ?? {} };
    }
  }
};
