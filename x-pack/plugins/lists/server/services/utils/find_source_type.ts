/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { SearchEsListItemSchema, Type, type } from '../../../common/schemas';

export const findSourceType = (
  listItem: SearchEsListItemSchema,
  types: string[] = Object.keys(type.keys)
): Type | null => {
  const foundEntry = Object.entries(listItem).find(
    ([key, value]) => types.includes(key) && value != null
  );
  if (foundEntry != null && type.is(foundEntry[0])) {
    return foundEntry[0];
  } else {
    return null;
  }
};
