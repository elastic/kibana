/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The time column every source must return. Sampling, KI query validation, KI rules and
 * baselines all read sources through time windows on this column.
 */
export const SOURCE_TIMESTAMP_FIELD = '@timestamp';

const TIMESTAMP_COLUMN_TYPES: ReadonlySet<string> = new Set(['date', 'date_nanos']);

/**
 * Returns why the columns a source query returns cannot serve as a source, or `undefined` when
 * they include a usable {@link SOURCE_TIMESTAMP_FIELD}. A type conflict across backing indices
 * comes back from ES|QL as `unsupported` and is refused like any other non-date type.
 */
export const getTimestampColumnProblem = (
  columns: ReadonlyArray<{ name: string; type: string }>
): string | undefined => {
  const column = columns.find(({ name }) => name === SOURCE_TIMESTAMP_FIELD);
  if (!column) {
    return `The query must return a [${SOURCE_TIMESTAMP_FIELD}] column. Nightshift reads every source over time windows on it.`;
  }
  if (!TIMESTAMP_COLUMN_TYPES.has(column.type)) {
    return `The [${SOURCE_TIMESTAMP_FIELD}] column must be a date or date_nanos, but the query returns it as [${column.type}].`;
  }
  return undefined;
};
