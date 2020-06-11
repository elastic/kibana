/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  CreateExceptionListItemSchemaPartial,
  CreateExceptionListSchemaPartial,
  ExceptionListItemSchema,
  ExceptionListSchema,
  NamespaceType,
} from '../../common/schemas';
import { HttpStart } from '../../../../../src/core/public';

export interface FilterExceptionsOptions {
  filter: string;
  tags: string[];
}

export interface Pagination {
  page: number;
  perPage: number;
  total: number;
}

export type AddExceptionList = ExceptionListSchema | CreateExceptionListSchemaPartial;

export type AddExceptionListItem = CreateExceptionListItemSchemaPartial | ExceptionListItemSchema;

export interface PersistHookProps {
  http: HttpStart;
  onError: (arg: Error) => void;
}

export interface ExceptionList extends ExceptionListSchema {
  totalItems: number;
}

export interface UseExceptionListProps {
  http: HttpStart;
  lists: ExceptionIdentifiers[];
  onError: (arg: Error) => void;
  filterOptions?: FilterExceptionsOptions;
  pagination?: Pagination;
  dispatchListsInReducer?: ({
    lists,
    exceptions,
    pagination,
  }: {
    lists: ExceptionList[];
    exceptions: ExceptionListItemSchema[];
    pagination: Pagination;
  }) => void;
}

export interface ExceptionIdentifiers {
  id: string;
  namespaceType: NamespaceType;
  type?: string;
}

export interface ApiCallByListIdProps {
  http: HttpStart;
  listId: string;
  namespaceType: NamespaceType;
  filterOptions?: FilterExceptionsOptions;
  pagination?: Pagination;
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

export interface AddExceptionListProps {
  http: HttpStart;
  list: AddExceptionList;
  signal: AbortSignal;
}

export interface AddExceptionListItemProps {
  http: HttpStart;
  listItem: AddExceptionListItem;
  signal: AbortSignal;
}
