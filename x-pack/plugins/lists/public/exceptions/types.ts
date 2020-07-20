/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  CreateExceptionListItemSchema,
  CreateExceptionListSchema,
  ExceptionListItemSchema,
  ExceptionListSchema,
  ExceptionListType,
  NamespaceType,
  Page,
  PerPage,
  TotalOrUndefined,
  UpdateExceptionListItemSchema,
  UpdateExceptionListSchema,
} from '../../common/schemas';
import { HttpStart } from '../../../../../src/core/public';

export interface FilterExceptionsOptions {
  filter: string;
  tags: string[];
}

export interface Pagination {
  page: Page;
  perPage: PerPage;
  total: TotalOrUndefined;
}

export type AddExceptionList = UpdateExceptionListSchema | CreateExceptionListSchema;

export type AddExceptionListItem = CreateExceptionListItemSchema | UpdateExceptionListItemSchema;

export interface PersistHookProps {
  http: HttpStart;
  onError: (arg: Error) => void;
}

export interface ExceptionList extends ExceptionListSchema {
  totalItems: number;
}

export interface UseExceptionListSuccess {
  lists: ExceptionList[];
  exceptions: ExceptionListItemSchema[];
  pagination: Pagination;
}

export interface UseExceptionListProps {
  http: HttpStart;
  lists: ExceptionIdentifiers[];
  onError?: (arg: string[]) => void;
  filterOptions?: FilterExceptionsOptions;
  pagination?: Pagination;
  onSuccess?: (arg: UseExceptionListSuccess) => void;
}

export interface ExceptionIdentifiers {
  id: string;
  namespaceType: NamespaceType;
  type: ExceptionListType;
}

export interface ApiCallByListIdProps {
  http: HttpStart;
  listId: string;
  namespaceType: NamespaceType;
  filterOptions?: FilterExceptionsOptions;
  pagination: Partial<Pagination>;
  signal: AbortSignal;
}

export interface ApiCallByIdProps {
  http: HttpStart;
  id: string;
  namespaceType: NamespaceType;
  signal: AbortSignal;
}

export interface ApiCallMemoProps {
  id: string;
  namespaceType: NamespaceType;
  onError: (arg: string[]) => void;
  onSuccess: () => void;
}

export interface AddExceptionListProps {
  http: HttpStart;
  list: CreateExceptionListSchema;
  signal: AbortSignal;
}

export interface AddExceptionListItemProps {
  http: HttpStart;
  listItem: CreateExceptionListItemSchema;
  signal: AbortSignal;
}

export interface UpdateExceptionListProps {
  http: HttpStart;
  list: UpdateExceptionListSchema;
  signal: AbortSignal;
}

export interface UpdateExceptionListItemProps {
  http: HttpStart;
  listItem: UpdateExceptionListItemSchema;
  signal: AbortSignal;
}

export interface AddEndpointExceptionListProps {
  http: HttpStart;
  signal: AbortSignal;
}
