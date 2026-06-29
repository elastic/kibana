/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AT_TIMESTAMP } from '@kbn/apm-types';

const SOURCE_COLUMN = '_source';

export function isDiscoverDefaultLogColumns(columns?: string[]): boolean {
  if (!columns || !Array.isArray(columns) || columns.length === 0) {
    return true;
  }

  const withoutTimestamp = columns.filter((column) => column !== AT_TIMESTAMP);

  return (
    withoutTimestamp.length === 0 ||
    (withoutTimestamp.length === 1 && withoutTimestamp[0] === SOURCE_COLUMN)
  );
}

export function getTraceLogsColumns({
  urlColumns,
  defaultColumns,
}: {
  urlColumns?: string[];
  defaultColumns?: string[];
}): string[] | undefined {
  if (urlColumns && urlColumns.length > 0 && !isDiscoverDefaultLogColumns(urlColumns)) {
    return urlColumns;
  }

  const columns = Array.isArray(defaultColumns) ? defaultColumns : [];
  const configuredColumns = columns.filter((column) => column !== SOURCE_COLUMN);

  return configuredColumns.length > 0 ? configuredColumns : undefined;
}
