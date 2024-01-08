/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { DatatableColumn } from '@kbn/expressions-plugin/public';

const cachedColumns = new Map<string, DatatableColumn[]>();

export const addColumnsToCache = (query: string, list: DatatableColumn[]) => {
  const trimmedQuery = query.replaceAll('\n', '').trim();
  cachedColumns.set(trimmedQuery, list);
};

export const getColumnsFromCache = (query: string) => {
  const trimmedQuery = query.replaceAll('\n', '').trim();
  return cachedColumns.get(trimmedQuery);
};
