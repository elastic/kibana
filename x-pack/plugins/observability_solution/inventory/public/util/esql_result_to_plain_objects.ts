/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EsqlQueryResult } from './run_esql_query';

export function esqlResultToPlainObjects<T extends Record<string, any>>(
  result: EsqlQueryResult
): T[] {
  return result.rows.map((row) => {
    return row.reduce<Record<string, unknown>>((acc, value, index) => {
      const column = result.columns[index];
      acc[column.name] = value;
      return acc;
    }, {});
  }) as T[];
}
