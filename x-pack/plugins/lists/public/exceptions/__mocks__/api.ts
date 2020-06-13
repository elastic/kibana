/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getExceptionListItemSchemaMock } from '../../../common/schemas/response/exception_list_item_schema.mock';
import { getExceptionListSchemaMock } from '../../../common/schemas/response/exception_list_schema.mock';
import { getFoundExceptionListItemSchemaMock } from '../../../common/schemas/response/found_exception_list_item_schema.mock';
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
  UpdateExceptionListItemProps,
  UpdateExceptionListProps,
} from '../types';

/* eslint-disable @typescript-eslint/no-unused-vars */
export const addExceptionList = async ({
  http,
  list,
  signal,
}: AddExceptionListProps): Promise<ExceptionListSchema> =>
  Promise.resolve(getExceptionListSchemaMock());

export const addExceptionListItem = async ({
  http,
  listItem,
  signal,
}: AddExceptionListItemProps): Promise<ExceptionListItemSchema> =>
  Promise.resolve(getExceptionListItemSchemaMock());

export const updateExceptionList = async ({
  http,
  list,
  signal,
}: UpdateExceptionListProps): Promise<ExceptionListSchema> =>
  Promise.resolve(getExceptionListSchemaMock());

export const updateExceptionListItem = async ({
  http,
  listItem,
  signal,
}: UpdateExceptionListItemProps): Promise<ExceptionListItemSchema> =>
  Promise.resolve(getExceptionListItemSchemaMock());

export const fetchExceptionListById = async ({
  http,
  id,
  signal,
}: ApiCallByIdProps): Promise<ExceptionListSchema> => Promise.resolve(getExceptionListSchemaMock());

export const fetchExceptionListItemsByListId = async ({
  filterOptions,
  http,
  listId,
  pagination,
  signal,
}: ApiCallByListIdProps): Promise<FoundExceptionListItemSchema> =>
  Promise.resolve(getFoundExceptionListItemSchemaMock());

export const fetchExceptionListItemById = async ({
  http,
  id,
  signal,
}: ApiCallByIdProps): Promise<ExceptionListItemSchema> =>
  Promise.resolve(getExceptionListItemSchemaMock());

export const deleteExceptionListById = async ({
  http,
  id,
  namespaceType,
  signal,
}: ApiCallByIdProps): Promise<ExceptionListSchema> => Promise.resolve(getExceptionListSchemaMock());

export const deleteExceptionListItemById = async ({
  http,
  id,
  namespaceType,
  signal,
}: ApiCallByIdProps): Promise<ExceptionListItemSchema> =>
  Promise.resolve(getExceptionListItemSchemaMock());
