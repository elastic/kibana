/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EXCEPTION_LIST_ITEM_URL, EXCEPTION_LIST_URL } from '../../common/constants';
import {
  ExceptionListItemSchema,
  ExceptionListSchema,
  FoundExceptionListItemSchema,
} from '../../common/schemas';

import {
  AddExceptionListItemProps,
  AddExceptionListProps,
  ApiCallByIdProps,
  ApiCallByListIdProps,
} from './types';

/**
 * Add provided ExceptionList
 *
 * @param list exception list to add
 * @param signal to cancel request
 *
 * @throws An error if response is not OK
 *
 * Uses type assertion (list as ExceptionListSchema)
 * per suggestion in Typescript union docs
 */
export const addExceptionList = async ({
  http,
  list,
  signal,
}: AddExceptionListProps): Promise<ExceptionListSchema> =>
  http.fetch<ExceptionListSchema>(EXCEPTION_LIST_URL, {
    body: JSON.stringify(list),
    method: (list as ExceptionListSchema).id != null ? 'PUT' : 'POST',
    signal,
  });

/**
 * Add provided ExceptionListItem
 *
 * @param listItem exception list item to add
 * @param signal to cancel request
 *
 * @throws An error if response is not OK
 *
 * Uses type assertion (listItem as ExceptionListItemSchema)
 * per suggestion in Typescript union docs
 */
export const addExceptionListItem = async ({
  http,
  listItem,
  signal,
}: AddExceptionListItemProps): Promise<ExceptionListItemSchema> =>
  http.fetch<ExceptionListItemSchema>(`${EXCEPTION_LIST_ITEM_URL}`, {
    body: JSON.stringify(listItem),
    method: (listItem as ExceptionListItemSchema).id != null ? 'PUT' : 'POST',
    signal,
  });

/**
 * Fetch an ExceptionList by providing a ExceptionList ID
 *
 * @param id ExceptionList ID (not list_id)
 * @param signal to cancel request
 *
 * @throws An error if response is not OK
 */
export const fetchExceptionListById = async ({
  http,
  id,
  signal,
}: ApiCallByIdProps): Promise<ExceptionListSchema> =>
  http.fetch<ExceptionListSchema>(`${EXCEPTION_LIST_URL}`, {
    method: 'GET',
    query: { id },
    signal,
  });

/**
 * Fetch an ExceptionList's ExceptionItems by providing a ExceptionList list_id
 *
 * @param id ExceptionList list_id (not ID)
 * @param signal to cancel request
 *
 * @throws An error if response is not OK
 */
export const fetchExceptionListItemsByListId = async ({
  http,
  listId,
  listType,
  filterOptions = {
    filter: '',
    sortField: 'enabled',
    sortOrder: 'desc',
    tags: [],
  },
  pagination = {
    page: 1,
    perPage: 20,
    total: 0,
  },
  signal,
}: ApiCallByListIdProps): Promise<FoundExceptionListItemSchema> => {
  // TODO - figure out if SO space should be determined here or server side
  const namespaceType = listType === 'endpoint' ? 'agnostic' : 'single';
  const filters = [
    ...(filterOptions.filter.length
      ? [`exception-list.attributes.entries.field: ${filterOptions.filter}`]
      : []),
    ...(filterOptions.tags?.map((t) => `exception-list.attributes.tags: ${t}`) ?? []),
  ];

  const query = {
    listId,
    namespaceType,
    page: pagination.page,
    per_page: pagination.perPage,
    sort_field: filterOptions.sortField,
    sort_order: filterOptions.sortOrder,
    ...(filters.length ? { filter: filters.join(' AND ') } : {}),
  };

  return http.fetch<FoundExceptionListItemSchema>(`${EXCEPTION_LIST_ITEM_URL}/_find`, {
    method: 'GET',
    query,
    signal,
  });
};

/**
 * Fetch an ExceptionListItem by providing a ExceptionListItem ID
 *
 * @param id ExceptionListItem ID (not item_id)
 * @param signal to cancel request
 *
 * @throws An error if response is not OK
 */
export const fetchExceptionListItemById = async ({
  http,
  id,
  signal,
}: ApiCallByIdProps): Promise<ExceptionListItemSchema> =>
  http.fetch<ExceptionListItemSchema>(`${EXCEPTION_LIST_ITEM_URL}`, {
    method: 'GET',
    query: { id },
    signal,
  });

/**
 * Delete an ExceptionList by providing a ExceptionList ID
 *
 * @param id ExceptionList ID (not list_id)
 * @param signal to cancel request
 *
 * @throws An error if response is not OK
 */
export const deleteExceptionListById = async ({
  http,
  id,
  signal,
}: ApiCallByIdProps): Promise<ExceptionListSchema> =>
  http.fetch<ExceptionListSchema>(`${EXCEPTION_LIST_URL}`, {
    method: 'DELETE',
    query: { id },
    signal,
  });

/**
 * Delete an ExceptionListItem by providing a ExceptionListItem ID
 *
 * @param id ExceptionListItem ID (not item_id)
 * @param signal to cancel request
 *
 * @throws An error if response is not OK
 */
export const deleteExceptionListItemById = async ({
  http,
  id,
  signal,
}: ApiCallByIdProps): Promise<ExceptionListItemSchema> =>
  http.fetch<ExceptionListItemSchema>(`${EXCEPTION_LIST_ITEM_URL}`, {
    method: 'DELETE',
    query: { id },
    signal,
  });
