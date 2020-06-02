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

export interface ExceptionItemsAndPagination {
  items: ExceptionListItemSchema[];
  pagination: Pagination;
}

export interface ExceptionListAndItems extends ExceptionListSchema {
  exceptionItems: ExceptionItemsAndPagination;
}

export type AddExceptionList = ExceptionListSchema | CreateExceptionListSchemaPartial;

export type AddExceptionListItem = CreateExceptionListItemSchemaPartial | ExceptionListItemSchema;

export interface PersistHookProps {
  http: HttpStart;
  onError: (arg: Error) => void;
}

export interface UseExceptionListProps {
  filterOptions?: FilterExceptionsOptions;
  http: HttpStart;
  id: string | undefined;
  namespaceType: NamespaceType;
  onError: (arg: Error) => void;
  pagination?: Pagination;
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
