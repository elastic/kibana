/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Mustache from 'mustache';

import { SearchEsListItemSchema, esDataTypeDateRange, type } from '../../../common/schemas';

export const findSourceValue = (
  hit: SearchEsListItemSchema,
  types: string[] = Object.keys(type.keys)
): string | null => {
  const foundEntry = Object.entries(hit).find(
    ([key, value]) => types.includes(key) && value != null
  );
  if (foundEntry != null) {
    const [typeFound, value] = foundEntry;
    if (typeFound === 'date_range' && esDataTypeDateRange.is(value)) {
      const template = hit.deserializer ?? '{{gte}},{{lte}}';
      const variables = { gte: value.gte, lte: value.lte };
      return Mustache.render(template, variables);
    } else if (typeof value === 'string') {
      // TODO: Add the formatter ability here with {{value}}
      return value;
    } else {
      return null;
    }
  } else {
    return null;
  }
};
