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
import { HttpStart, NotificationsStart } from '../../../../../src/core/public';

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

export interface UseExceptionListItemsSuccess {
  exceptions: ExceptionListItemSchema[];
  pagination: Pagination;
}

export interface UseExceptionListProps {
  http: HttpStart;
  lists: ExceptionListIdentifiers[];
  onError?: (arg: string[]) => void;
  filterOptions: FilterExceptionsOptions[];
  pagination?: Pagination;
  showDetectionsListsOnly: boolean;
  showEndpointListsOnly: boolean;
  matchFilters: boolean;
  onSuccess?: (arg: UseExceptionListItemsSuccess) => void;
}

export interface ExceptionListIdentifiers {
  id: string;
  listId: string;
  namespaceType: NamespaceType;
  type: ExceptionListType;
}

export interface ApiCallByListIdProps {
  http: HttpStart;
  listIds: string[];
  namespaceTypes: NamespaceType[];
  filterOptions: FilterExceptionsOptions[];
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
  onError: (arg: Error) => void;
  onSuccess: () => void;
}

// TODO: Switch to use ApiCallMemoProps
// after cleaning up exceptions/api file to
// remove unnecessary validation checks
export interface ApiListExportProps {
  id: string;
  listId: string;
  namespaceType: NamespaceType;
  onError: (err: Error) => void;
  onSuccess: (blob: Blob) => void;
}

export interface ApiCallFindListsItemsMemoProps {
  lists: ExceptionListIdentifiers[];
  filterOptions: FilterExceptionsOptions[];
  pagination: Partial<Pagination>;
  showDetectionsListsOnly: boolean;
  showEndpointListsOnly: boolean;
  onError: (arg: string[]) => void;
  onSuccess: (arg: UseExceptionListItemsSuccess) => void;
}
export interface ApiCallFetchExceptionListsProps {
  http: HttpStart;
  namespaceTypes: string;
  pagination: Partial<Pagination>;
  filters: string;
  signal: AbortSignal;
}

export interface UseExceptionListsSuccess {
  exceptions: ExceptionListSchema[];
  pagination: Pagination;
}

export interface ExceptionListFilter {
  name?: string | null;
  list_id?: string | null;
  created_by?: string | null;
}

export interface UseExceptionListsProps {
  errorMessage: string;
  filterOptions?: ExceptionListFilter;
  http: HttpStart;
  namespaceTypes: NamespaceType[];
  notifications: NotificationsStart;
  pagination?: Pagination;
  showTrustedApps: boolean;
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

export interface ExportExceptionListProps {
  http: HttpStart;
  id: string;
  listId: string;
  namespaceType: NamespaceType;
  signal: AbortSignal;
}
