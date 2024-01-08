/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { AggregateQuery } from '@kbn/es-query';
import type { DatatableColumn } from '@kbn/expressions-plugin/public';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';

import type { TextBasedLayerColumn } from './types';
import { getAllColumns } from './utils';
import { fetchFieldsFromESQL } from './fetch_fields_from_esql';

let fieldListCache: DatatableColumn[];

export const addToCache = (list: DatatableColumn[]) => {
  fieldListCache = [...list];
};

export const retrieveFromCache = () => {
  return fieldListCache ?? [];
};

export const retrieveLayerColumnsFromCache = (
  existingColumns: TextBasedLayerColumn[]
): TextBasedLayerColumn[] => {
  return getAllColumns(existingColumns, fieldListCache ?? []);
};

export const updateCacheFromQuery = async (
  query: AggregateQuery,
  expressions: ExpressionsStart
) => {
  // Fetching only columns for ES|QL for performance reasons with limit 0
  const performantQuery = { ...query };
  if ('esql' in performantQuery && performantQuery.esql) {
    performantQuery.esql = `${performantQuery.esql} | limit 0`;
  }
  const table = await fetchFieldsFromESQL(performantQuery, expressions);
  if (table) {
    addToCache(table.columns);
  }
};
