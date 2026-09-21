/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';

type Separator = 'OR' | 'AND';

export const toKueryFilterFormat = (key: string, values: string[], separator: Separator = 'OR') =>
  values.map((value) => `${key} : "${value}"`).join(` ${separator} `);

export const mergeKueries = (filters: string[], separator: Separator = 'AND') =>
  filters.filter((filter) => !isEmpty(filter)).join(` ${separator} `);

/**
 * ORs `field : "value"` clauses for the same logical value across several fields, wrapping the
 * result in parentheses when more than one clause is present so it stays safe to AND into a
 * larger kuery. Pairs with an empty value are skipped.
 */
export const toAnyOfKuery = (pairs: Array<[field: string, value?: string]>) => {
  const clauses = pairs
    .filter((pair): pair is [string, string] => !isEmpty(pair[1]))
    .map(([field, value]) => `${field} : "${value}"`);

  return clauses.length > 1 ? `(${clauses.join(' or ')})` : (clauses[0] ?? '');
};
