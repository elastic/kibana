/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ExceptionListItemSchema,
  ImportExceptionListItemSchemaDecoded,
  NamespaceType,
} from '@kbn/securitysolution-io-ts-list-types';
import { getSavedObjectTypes } from '@kbn/securitysolution-list-utils';
import { SavedObjectsClientContract, SavedObjectsFindResponse } from '@kbn/core/server';

import { ExceptionListSoSchema } from '../../../../schemas/saved_objects';
import { getExceptionListsItemFilter } from '../get_exception_lists_item_filter';
import { CHUNK_PARSED_OBJECT_SIZE } from '../../import_exception_list_and_items';
import { transformSavedObjectsToFoundExceptionListItem } from '..';

/**
 * Helper to build out a filter using item_ids
 * @param objects {array} - exception list items to add to filter
 * @param savedObjectsClient {object}
 * @returns {string} filter
 */
export const getItemsFilter = ({
  objects,
  namespaceType,
}: {
  objects: ImportExceptionListItemSchemaDecoded[];
  namespaceType: NamespaceType;
}): string => {
  return `${
    getSavedObjectTypes({
      namespaceType: [namespaceType],
    })[0]
  }.attributes.item_id:(${objects.map((item) => item.item_id).join(' OR ')})`;
};

/**
 * Find exception items that may or may not match an existing item_id
 * @param agnosticListItems {array} - items with a namespace of agnostic
 * @param nonAgnosticListItems {array} - items with a namespace of single
 * @param savedObjectsClient {object}
 * @returns {object} results of any found items
 */
export const findAllListItemTypes = async (
  agnosticListItems: ImportExceptionListItemSchemaDecoded[],
  nonAgnosticListItems: ImportExceptionListItemSchemaDecoded[],
  savedObjectsClient: SavedObjectsClientContract
): Promise<SavedObjectsFindResponse<ExceptionListSoSchema> | null> => {
  // Agnostic filter
  const agnosticFilter = getItemsFilter({
    namespaceType: 'agnostic',
    objects: agnosticListItems,
  });

  // Non-agnostic filter
  const nonAgnosticFilter = getItemsFilter({
    namespaceType: 'single',
    objects: nonAgnosticListItems,
  });

  // savedObjectTypes
  const savedObjectType = getSavedObjectTypes({ namespaceType: ['single'] });
  const savedObjectTypeAgnostic = getSavedObjectTypes({ namespaceType: ['agnostic'] });

  if (!agnosticListItems.length && !nonAgnosticListItems.length) {
    return null;
  } else if (agnosticListItems.length && !nonAgnosticListItems.length) {
    return savedObjectsClient.find<ExceptionListSoSchema>({
      filter: getExceptionListsItemFilter({
        filter: [agnosticFilter],
        listId: agnosticListItems.map(({ list_id: listId }) => listId),
        savedObjectType: agnosticListItems.map(
          ({ namespace_type: namespaceType }) =>
            getSavedObjectTypes({ namespaceType: [namespaceType] })[0]
        ),
      }),
      page: undefined,
      perPage: CHUNK_PARSED_OBJECT_SIZE,
      sortField: undefined,
      sortOrder: undefined,
      type: savedObjectTypeAgnostic,
    });
  } else if (!agnosticListItems.length && nonAgnosticListItems.length) {
    return savedObjectsClient.find<ExceptionListSoSchema>({
      filter: getExceptionListsItemFilter({
        filter: [nonAgnosticFilter],
        listId: nonAgnosticListItems.map(({ list_id: listId }) => listId),
        savedObjectType: nonAgnosticListItems.map(
          ({ namespace_type: namespaceType }) =>
            getSavedObjectTypes({ namespaceType: [namespaceType] })[0]
        ),
      }),
      page: undefined,
      perPage: CHUNK_PARSED_OBJECT_SIZE,
      sortField: undefined,
      sortOrder: undefined,
      type: savedObjectType,
    });
  } else {
    const items = [...nonAgnosticListItems, ...agnosticListItems];
    return savedObjectsClient.find<ExceptionListSoSchema>({
      filter: getExceptionListsItemFilter({
        filter: [nonAgnosticFilter, agnosticFilter],
        listId: items.map(({ list_id: listId }) => listId),
        savedObjectType: items.map(
          ({ namespace_type: namespaceType }) =>
            getSavedObjectTypes({ namespaceType: [namespaceType] })[0]
        ),
      }),
      page: undefined,
      perPage: CHUNK_PARSED_OBJECT_SIZE,
      sortField: undefined,
      sortOrder: undefined,
      type: [...savedObjectType, ...savedObjectTypeAgnostic],
    });
  }
};

/**
 * Helper to find if any imported items match existing items based on item_id
 * @param agnosticListItems {array} - items with a namespace of agnostic
 * @param nonAgnosticListItems {array} - items with a namespace of single
 * @param savedObjectsClient {object}
 * @returns {object} results of any found items
 */
export const getAllListItemTypes = async (
  agnosticListItems: ImportExceptionListItemSchemaDecoded[],
  nonAgnosticListItems: ImportExceptionListItemSchemaDecoded[],
  savedObjectsClient: SavedObjectsClientContract
): Promise<Record<string, ExceptionListItemSchema>> => {
  // Gather items with matching item_id
  const foundItemsResponse = await findAllListItemTypes(
    agnosticListItems,
    nonAgnosticListItems,
    savedObjectsClient
  );

  if (foundItemsResponse == null) {
    return {};
  }

  const transformedResponse = transformSavedObjectsToFoundExceptionListItem({
    savedObjectsFindResponse: foundItemsResponse,
  });

  // Dictionary of found items
  return transformedResponse.data.reduce(
    (acc, item) => ({
      ...acc,
      [item.item_id]: item,
    }),
    {}
  );
};
