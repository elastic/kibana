/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaServices } from '../../../common/lib/kibana';
import { EXCEPTIONS_LIST_URL } from '../../../../common/constants';
import {
  ExceptionListItemSchema,
  ExceptionListSchema,
  AcknowledgeSchema,
} from '../../../../../lists/common/schemas';
import { AddExceptionListProps, AddExceptionListItemProps, ReturnExceptionItems } from './types';

/**
 * Add provided ExceptionList
 *
 * @param list exception list to add
 * @param signal to cancel request
 *
 * @throws An error if response is not OK
 */
export const addExceptionList = async ({
  list,
  signal,
}: AddExceptionListProps): Promise<ExceptionListSchema> =>
  KibanaServices.get().http.fetch<ExceptionListSchema>(EXCEPTIONS_LIST_URL, {
    method: list.id != null ? 'PUT' : 'POST',
    body: JSON.stringify(list),
    signal,
  });

/**
 * Add provided ExceptionListItem
 *
 * @param listItem exception list item to add
 * @param signal to cancel request
 *
 * @throws An error if response is not OK
 */
export const addExceptionListItem = async ({
  listItem,
  signal,
}: AddExceptionListItemProps): Promise<ExceptionListItemSchema> =>
  KibanaServices.get().http.fetch<ExceptionListItemSchema>(`${EXCEPTIONS_LIST_URL}/items`, {
    method: listItem.id != null ? 'PUT' : 'POST',
    body: JSON.stringify(listItem),
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
  id,
  signal,
}: {
  id: string;
  signal: AbortSignal;
}): Promise<ExceptionListSchema> =>
  KibanaServices.get().http.fetch<ExceptionListSchema>(`${EXCEPTIONS_LIST_URL}`, {
    method: 'GET',
    query: { id },
    signal,
  });

/**
 * Fetch an ExceptionList's items by providing a ExceptionList ID
 *
 * @param id ExceptionList ID (not list_id)
 * @param signal to cancel request
 *
 * @throws An error if response is not OK
 */
export const fetchExceptionListItemsByListId = async ({
  listId,
  signal,
}: {
  listId: string;
  signal: AbortSignal;
}): Promise<ReturnExceptionItems> =>
  KibanaServices.get().http.fetch<ReturnExceptionItems>(`${EXCEPTIONS_LIST_URL}/items/_find`, {
    method: 'GET',
    query: { list_id: listId },
    signal,
  });

/**
 * Fetch an ExceptionListItem by providing a ExceptionListItem ID
 *
 * @param id ExceptionListItem ID (not list_id)
 * @param signal to cancel request
 *
 * @throws An error if response is not OK
 */
export const fetchExceptionListItemById = async ({
  id,
  signal,
}: {
  id: string;
  signal: AbortSignal;
}): Promise<ExceptionListItemSchema> =>
  KibanaServices.get().http.fetch<ExceptionListItemSchema>(`${EXCEPTIONS_LIST_URL}/items`, {
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
  id,
  signal,
}: {
  id: string;
  signal: AbortSignal;
}): Promise<AcknowledgeSchema> =>
  KibanaServices.get().http.fetch<AcknowledgeSchema>(`${EXCEPTIONS_LIST_URL}`, {
    method: 'DELETE',
    query: { id },
    signal,
  });

/**
 * Delete an ExceptionListItem by providing a ExceptionListItem ID
 *
 * @param id ExceptionListItem ID (not list_id)
 * @param signal to cancel request
 *
 * @throws An error if response is not OK
 */
export const deleteExceptionListItemById = async ({
  id,
  signal,
}: {
  id: string;
  signal: AbortSignal;
}): Promise<AcknowledgeSchema> =>
  KibanaServices.get().http.fetch<AcknowledgeSchema>(`${EXCEPTIONS_LIST_URL}/items`, {
    method: 'DELETE',
    query: { id },
    signal,
  });
