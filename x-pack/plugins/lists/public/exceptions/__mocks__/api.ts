/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  ExceptionListItemSchema,
  ExceptionListSchema,
  FoundExceptionListItemSchema,
} from '../../../common/schemas';
import {
  AddExceptionListItemProps,
  AddExceptionListProps,
  ApiCallByIdProps,
  ApiCallByListIdProps,
} from '../types';
import { mockExceptionItem, mockExceptionList } from '../mock';

/* eslint-disable @typescript-eslint/no-unused-vars */
export const addExceptionList = async ({
  http,
  list,
  signal,
}: AddExceptionListProps): Promise<ExceptionListSchema> => Promise.resolve(mockExceptionList);

export const addExceptionListItem = async ({
  http,
  listItem,
  signal,
}: AddExceptionListItemProps): Promise<ExceptionListItemSchema> =>
  Promise.resolve(mockExceptionItem);

export const fetchExceptionListById = async ({
  http,
  id,
  signal,
}: ApiCallByIdProps): Promise<ExceptionListSchema> => Promise.resolve(mockExceptionList);

export const fetchExceptionListItemsByListId = async ({
  filterOptions,
  http,
  listId,
  pagination,
  signal,
}: ApiCallByListIdProps): Promise<FoundExceptionListItemSchema> =>
  Promise.resolve({ data: [mockExceptionItem], page: 1, per_page: 20, total: 1 });

export const fetchExceptionListItemById = async ({
  http,
  id,
  signal,
}: ApiCallByIdProps): Promise<ExceptionListItemSchema> => Promise.resolve(mockExceptionItem);
