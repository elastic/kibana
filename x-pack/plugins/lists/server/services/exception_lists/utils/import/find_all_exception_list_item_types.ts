/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ImportExceptionListItemSchemaDecoded,
  NamespaceType,
} from '@kbn/securitysolution-io-ts-list-types';
import { getSavedObjectTypes } from '@kbn/securitysolution-list-utils';
import { SavedObjectsClientContract, SavedObjectsFindResponse } from 'kibana/server';

import { ExceptionListSoSchema } from '../../../../schemas/saved_objects';
import { getExceptionListsItemFilter } from '../../find_exception_list_items';
import { CHUNK_PARSED_OBJECT_SIZE } from '../../import_exception_list_and_items';
import { transformSavedObjectsToFoundExceptionListItem } from '..';

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

  if (agnosticListItems.length && !nonAgnosticListItems.length) {
    return null;
  } else if (agnosticListItems.length && !nonAgnosticListItems.length) {
    const savedObjectType = getSavedObjectTypes({ namespaceType: ['agnostic'] });
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
      type: savedObjectType,
    });
  } else if (!agnosticListItems.length && nonAgnosticListItems.length) {
    const savedObjectType = getSavedObjectTypes({ namespaceType: ['single'] });
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
        filter: [nonAgnosticFilter],
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
      type: ['single', 'agnostic'],
    });
  }
};

export const getAllListItemTypes = async (
  agnosticListItems: ImportExceptionListItemSchemaDecoded[],
  nonAgnosticListItems: ImportExceptionListItemSchemaDecoded[],
  savedObjectsClient: SavedObjectsClientContract
): Promise<Record<string, ImportExceptionListItemSchemaDecoded>> => {
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
