/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EXCEPTION_LIST_ITEM_URL,
  EXCEPTION_LIST_NAMESPACE,
  EXCEPTION_LIST_NAMESPACE_AGNOSTIC,
  EXCEPTION_LIST_URL,
} from '../../common/constants';
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
 * @param http Kibana http service
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
 * @param http Kibana http service
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
 * @param http Kibana http service
 * @param id ExceptionList ID (not list_id)
 * @param namespaceType ExceptionList namespace_type
 * @param signal to cancel request
 *
 * @throws An error if response is not OK
 */
export const fetchExceptionListById = async ({
  http,
  id,
  namespaceType,
  signal,
}: ApiCallByIdProps): Promise<ExceptionListSchema> =>
  http.fetch<ExceptionListSchema>(`${EXCEPTION_LIST_URL}`, {
    method: 'GET',
    query: { id, namespace_type: namespaceType },
    signal,
  });

/**
 * Fetch an ExceptionList's ExceptionItems by providing a ExceptionList list_id
 *
 * @param http Kibana http service
 * @param listId ExceptionList list_id (not ID)
 * @param namespaceType ExceptionList namespace_type
 * @param filterOptions optional - filter by field or tags
 * @param pagination optional
 * @param signal to cancel request
 *
 * @throws An error if response is not OK
 */
export const fetchExceptionListItemsByListId = async ({
  http,
  listId,
  namespaceType,
  filterOptions = {
    filter: '',
    tags: [],
  },
  pagination = {
    page: 1,
    perPage: 20,
    total: 0,
  },
  signal,
}: ApiCallByListIdProps): Promise<FoundExceptionListItemSchema> => {
  const namespace =
    namespaceType === 'agnostic' ? EXCEPTION_LIST_NAMESPACE_AGNOSTIC : EXCEPTION_LIST_NAMESPACE;
  const filters = [
    ...(filterOptions.filter.length
      ? [`${namespace}.attributes.entries.field:${filterOptions.filter}*`]
      : []),
    ...(filterOptions.tags?.map((t) => `${namespace}.attributes.tags:${t}`) ?? []),
  ];

  const query = {
    list_id: listId,
    namespace_type: namespaceType,
    page: pagination.page,
    per_page: pagination.perPage,
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
 * @param http Kibana http service
 * @param id ExceptionListItem ID (not item_id)
 * @param namespaceType ExceptionList namespace_type
 * @param signal to cancel request
 *
 * @throws An error if response is not OK
 */
export const fetchExceptionListItemById = async ({
  http,
  id,
  namespaceType,
  signal,
}: ApiCallByIdProps): Promise<ExceptionListItemSchema> =>
  http.fetch<ExceptionListItemSchema>(`${EXCEPTION_LIST_ITEM_URL}`, {
    method: 'GET',
    query: { id, namespace_type: namespaceType },
    signal,
  });

/**
 * Delete an ExceptionList by providing a ExceptionList ID
 *
 * @param http Kibana http service
 * @param id ExceptionList ID (not list_id)
 * @param namespaceType ExceptionList namespace_type
 * @param signal to cancel request
 *
 * @throws An error if response is not OK
 */
export const deleteExceptionListById = async ({
  http,
  id,
  namespaceType,
  signal,
}: ApiCallByIdProps): Promise<ExceptionListSchema> =>
  http.fetch<ExceptionListSchema>(`${EXCEPTION_LIST_URL}`, {
    method: 'DELETE',
    query: { id, namespace_type: namespaceType },
    signal,
  });

/**
 * Delete an ExceptionListItem by providing a ExceptionListItem ID
 *
 * @param http Kibana http service
 * @param id ExceptionListItem ID (not item_id)
 * @param namespaceType ExceptionList namespace_type
 * @param signal to cancel request
 *
 * @throws An error if response is not OK
 */
export const deleteExceptionListItemById = async ({
  http,
  id,
  namespaceType,
  signal,
}: ApiCallByIdProps): Promise<ExceptionListItemSchema> =>
  http.fetch<ExceptionListItemSchema>(`${EXCEPTION_LIST_ITEM_URL}`, {
    method: 'DELETE',
    query: { id, namespace_type: namespaceType },
    signal,
  });
