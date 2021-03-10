/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CreateExceptionListItemSchema, EntriesArray, ExceptionListItemSchema } from '../schemas';

export const hasLargeValueItem = (
  exceptionItems: Array<ExceptionListItemSchema | CreateExceptionListItemSchema>
): boolean => {
  return exceptionItems.some((exceptionItem) => hasLargeValueList(exceptionItem.entries));
};

export const hasLargeValueList = (entries: EntriesArray): boolean => {
  const found = entries.filter(({ type }) => type === 'list');
  return found.length > 0;
};

export const hasNestedEntry = (entries: EntriesArray): boolean => {
  const found = entries.filter(({ type }) => type === 'nested');
  return found.length > 0;
};
