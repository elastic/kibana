/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { AggregateQuery } from '@kbn/es-query';
import type { DatatableColumn } from '@kbn/expressions-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import { LensPluginStartDependencies } from '../../plugin';
import type { TextBasedLayerColumn } from './types';
import { getAllColumns } from './utils';
import { fetchDataFromAggregateQuery } from './fetch_data_from_aggregate_query';

let fieldListCache: DatatableColumn[];

export const getQueryColumns = async (
  query: AggregateQuery,
  dataView: DataView,
  deps: LensPluginStartDependencies
) => {
  // Fetching only columns for ES|QL for performance reasons with limit 0
  // Important note: ES doesnt return the warnings for 0 limit,
  // I am skipping them in favor of performance now
  // but we should think another way to get them (from Lens embeddable or store)
  const performantQuery = { ...query };
  if ('esql' in performantQuery && performantQuery.esql) {
    performantQuery.esql = `${performantQuery.esql} | limit 0`;
  }
  const table = await fetchDataFromAggregateQuery(
    performantQuery,
    dataView,
    deps.data,
    deps.expressions
  );
  return table?.columns;
};

export const addToCache = (list: DatatableColumn[]) => {
  fieldListCache = [...list];
};

export const retrieveFromCache = () => {
  // if fieldCache is empty then retrieve from getQueryColumns
  return fieldListCache ?? [];
};

export const retrieveLayerColumnsFromCache = (
  existingColumns: TextBasedLayerColumn[]
): TextBasedLayerColumn[] => {
  // if fieldCache is empty then retrieve from getQueryColumns
  return getAllColumns(existingColumns, fieldListCache ?? []);
};
