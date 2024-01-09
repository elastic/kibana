/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { type AggregateQuery, getAggregateQueryMode } from '@kbn/es-query';
import type { DatatableColumn } from '@kbn/expressions-plugin/public';
import { getAllColumns } from './utils';
import type { TextBasedLayerColumn } from './types';

const cachedColumns = new Map<string, DatatableColumn[]>();

export const addColumnsToCache = (query: AggregateQuery, list: DatatableColumn[]) => {
  const language = getAggregateQueryMode(query);
  const queryString: string = query[language];
  const trimmedQuery = queryString.replaceAll('\n', '').trim();
  cachedColumns.set(trimmedQuery, list);
};

export const getColumnsFromCache = (query: AggregateQuery) => {
  const language = getAggregateQueryMode(query);
  const queryString: string = query[language];
  const trimmedQuery = queryString.replaceAll('\n', '').trim();
  return cachedColumns.get(trimmedQuery) ?? [];
};

export const retrieveLayerColumnsFromCache = (
  existingColumns: TextBasedLayerColumn[],
  query?: AggregateQuery
): TextBasedLayerColumn[] => {
  const columnsFromCache = query ? getColumnsFromCache(query) : [];
  return getAllColumns(existingColumns, columnsFromCache);
};
