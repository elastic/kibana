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
  FoundExceptionListItemSchema,
} from '../../common/schemas';
import { HttpStart } from '../../../../../src/core/public';

export interface ExceptionListAndItems extends ExceptionListSchema {
  exceptionItems: FoundExceptionListItemSchema;
}

export type AddExceptionList = ExceptionListSchema | CreateExceptionListSchemaPartial;

export type AddExceptionListItem = CreateExceptionListItemSchemaPartial | ExceptionListItemSchema;

export interface PersistHookProps {
  http: HttpStart;
  onError: (arg: Error) => void;
}

export interface UseExceptionListProps {
  http: HttpStart;
  id: string | undefined;
  onError: (arg: Error) => void;
}

export interface ApiCallByListIdProps {
  http: HttpStart;
  listId: string;
  signal: AbortSignal;
}

export interface ApiCallByIdProps {
  http: HttpStart;
  id: string;
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
