/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  ExceptionListItemSchema,
  ExceptionListSchema,
} from '../../../../../../lists/common/schemas';
import { AddExceptionListProps, AddExceptionListItemProps, ReturnExceptionItems } from '../types';
import { mockExceptionList, mockExceptionItem } from '../mock';

export const addExceptionList = async ({
  list,
  signal,
}: AddExceptionListProps): Promise<ExceptionListSchema> => Promise.resolve(mockExceptionList);

export const addExceptionListItem = async ({
  listItem,
  signal,
}: AddExceptionListItemProps): Promise<ExceptionListItemSchema> =>
  Promise.resolve(mockExceptionItem);

export const fetchExceptionListById = async ({
  id,
  signal,
}: {
  id: string;
  signal: AbortSignal;
}): Promise<ExceptionListSchema> => Promise.resolve(mockExceptionList);

export const fetchExceptionListItemsByListId = async ({
  listId,
  signal,
}: {
  listId: string;
  signal: AbortSignal;
}): Promise<ReturnExceptionItems> =>
  Promise.resolve({ data: [mockExceptionItem], page: 1, per_page: 20, total: 1 });

export const fetchExceptionListItemById = async ({
  id,
  signal,
}: {
  id: string;
  signal: AbortSignal;
}): Promise<ExceptionListItemSchema> => Promise.resolve(mockExceptionItem);
