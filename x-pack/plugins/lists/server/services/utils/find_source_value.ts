/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchEsListItemSchema, type } from '../../../common/schemas';

export const findSourceValue = (
  hit: SearchEsListItemSchema,
  types: string[] = Object.keys(type.keys)
): string | null => {
  const foundEntry = Object.entries(hit).find(
    ([key, value]) => types.includes(key) && value != null
  );
  if (foundEntry != null && typeof foundEntry[1] === 'string') {
    return foundEntry[1];
  } else {
    return null;
  }
};
