/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ExceptionListSchema,
  FoundExceptionListSchema,
  NamespaceType,
} from '@kbn/securitysolution-io-ts-list-types';
import { getSavedObjectTypes } from '@kbn/securitysolution-list-utils';
import { SavedObjectsClientContract } from '@kbn/core/server';

import { findExceptionList } from '../../find_exception_list';
import { CHUNK_PARSED_OBJECT_SIZE } from '../../import_exception_list_and_items';

export interface ExceptionListQueryInfo {
  listId: string;
  namespaceType: NamespaceType;
}
/**
 * Helper to build out a filter using list_id
 * @param objects {array} - exception lists to add to filter
 * @param savedObjectsClient {object}
 * @returns {string} filter
 */
export const getListFilter = ({
  objects,
  namespaceType,
}: {
  objects: ExceptionListQueryInfo[];
  namespaceType: NamespaceType;
}): string => {
  return `${
    getSavedObjectTypes({
      namespaceType: [namespaceType],
    })[0]
  }.attributes.list_id:(${objects.map((list) => list.listId).join(' OR ')})`;
};

/**
 * Find exception lists that may or may not match an existing list_id
 * @param agnosticListItems {array} - lists with a namespace of agnostic
 * @param nonAgnosticListItems {array} - lists with a namespace of single
 * @param savedObjectsClient {object}
 * @returns {object} results of any found lists
 */
export const findAllListTypes = async (
  agnosticListItems: ExceptionListQueryInfo[],
  nonAgnosticListItems: ExceptionListQueryInfo[],
  savedObjectsClient: SavedObjectsClientContract
): Promise<FoundExceptionListSchema | null> => {
  // Agnostic filter
  const agnosticFilter = getListFilter({
    namespaceType: 'agnostic',
    objects: agnosticListItems,
  });

  // Non-agnostic filter
  const nonAgnosticFilter = getListFilter({
    namespaceType: 'single',
    objects: nonAgnosticListItems,
  });

  if (!agnosticListItems.length && !nonAgnosticListItems.length) {
    return null;
  } else if (agnosticListItems.length && !nonAgnosticListItems.length) {
    return findExceptionList({
      filter: agnosticFilter,
      namespaceType: ['agnostic'],
      page: undefined,
      perPage: CHUNK_PARSED_OBJECT_SIZE,
      pit: undefined,
      savedObjectsClient,
      searchAfter: undefined,
      sortField: undefined,
      sortOrder: undefined,
    });
  } else if (!agnosticListItems.length && nonAgnosticListItems.length) {
    return findExceptionList({
      filter: nonAgnosticFilter,
      namespaceType: ['single'],
      page: undefined,
      perPage: CHUNK_PARSED_OBJECT_SIZE,
      pit: undefined,
      savedObjectsClient,
      searchAfter: undefined,
      sortField: undefined,
      sortOrder: undefined,
    });
  } else {
    return findExceptionList({
      filter: `${agnosticFilter} OR ${nonAgnosticFilter}`,
      namespaceType: ['single', 'agnostic'],
      page: undefined,
      perPage: CHUNK_PARSED_OBJECT_SIZE,
      pit: undefined,
      savedObjectsClient,
      searchAfter: undefined,
      sortField: undefined,
      sortOrder: undefined,
    });
  }
};

/**
 * Helper to find if any imported lists match existing lists based on list_id
 * @param agnosticListItems {array} - lists with a namespace of agnostic
 * @param nonAgnosticListItems {array} - lists with a namespace of single
 * @param savedObjectsClient {object}
 * @returns {object} results of any found lists
 */
export const getAllListTypes = async (
  agnosticListItems: ExceptionListQueryInfo[],
  nonAgnosticListItems: ExceptionListQueryInfo[],
  savedObjectsClient: SavedObjectsClientContract
): Promise<Record<string, ExceptionListSchema>> => {
  // Gather lists referenced
  const foundListsResponse = await findAllListTypes(
    agnosticListItems,
    nonAgnosticListItems,
    savedObjectsClient
  );

  if (foundListsResponse == null) {
    return {};
  }

  // Dictionary of found lists
  return foundListsResponse.data.reduce(
    (acc, list) => ({
      ...acc,
      [list.list_id]: list,
    }),
    {}
  );
};
