/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  ExceptionListItemSchema,
  ExceptionListSchema,
  CreateExceptionListSchemaPartial,
  CreateExceptionListItemSchemaPartial,
} from '../../../../../lists/common/schemas';

export interface ReturnExceptionItems {
  data: ExceptionListItemSchema[];
  page: number;
  per_page: number;
  total: number;
}

export interface ExceptionListAndItems extends ExceptionListSchema {
  exceptionItems: ReturnExceptionItems;
}

export interface NewExceptionList extends CreateExceptionListSchemaPartial {
  id?: string;
}

export interface NewExceptionListItem extends CreateExceptionListItemSchemaPartial {
  id?: string;
}

export interface AddExceptionListProps {
  list: NewExceptionList;
  signal: AbortSignal;
}

export interface AddExceptionListItemProps {
  listItem: NewExceptionListItem;
  signal: AbortSignal;
}
