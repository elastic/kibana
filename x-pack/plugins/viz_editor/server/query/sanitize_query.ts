/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Query, SelectOperation } from '../../common';
import { selectOperations } from './select_operations';

// If size is not specified in the query, we'll use this
const DEFAULT_SIZE = 100;

// Convert a select operation to a column name
function getColumnName(select: SelectOperation): string {
  const definition = selectOperations[select.operation];

  if (!definition) {
    return 'not_found';
  }

  return definition.getName ? definition.getName(select) : select.alias || select.operation;
}

/**
 * Validate and sanitize the query, ensures that alias is specified
 * for every select clause, and that size is specified.
 */
export function sanitizeQuery(query: Query): Query {
  const select = query.select.map(op => ({
    ...op,
    alias: getColumnName(op),
  }));

  return {
    ...query,
    select,
    size: query.size == null ? DEFAULT_SIZE : query.size,
  };
}
