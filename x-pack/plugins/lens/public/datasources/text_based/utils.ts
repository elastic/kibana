/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';

import { type AggregateQuery, getIndexPatternFromSQLQuery } from '@kbn/es-query';
import type { DatatableColumn } from '@kbn/expressions-plugin/public';
import { generateId } from '../../id_generator';
import { fetchDataFromAggregateQuery } from './fetch_data_from_aggregate_query';

import type { IndexPatternRef, TextBasedPrivateState, TextBasedLayerColumn } from './types';

export async function loadIndexPatternRefs(
  indexPatternsService: DataViewsPublicPluginStart
): Promise<IndexPatternRef[]> {
  const indexPatterns = await indexPatternsService.getIdsWithTitle();

  const timefields = await Promise.all(
    indexPatterns.map((p) => indexPatternsService.get(p.id).then((pat) => pat.timeFieldName))
  );

  return indexPatterns
    .map((p, i) => ({ ...p, timeField: timefields[i] }))
    .sort((a, b) => {
      return a.title.localeCompare(b.title);
    });
}

export const getAllColumns = (
  existingColumns: TextBasedLayerColumn[],
  columnsFromQuery: DatatableColumn[]
) => {
  // filter out columns that do not exist on the query
  const columns = existingColumns.filter((c) => {
    const columnExists = columnsFromQuery?.some((f) => f.name === c?.fieldName);
    if (columnExists) return c;
  });
  const allCols = [
    ...columns,
    ...columnsFromQuery.map((c) => ({ columnId: c.id, fieldName: c.id, meta: c.meta })),
  ];
  const uniqueIds: string[] = [];

  return allCols.filter((col) => {
    const isDuplicate = uniqueIds.includes(col.columnId);

    if (!isDuplicate) {
      uniqueIds.push(col.columnId);

      return true;
    }

    return false;
  });
};

export async function getStateFromAggregateQuery(
  state: TextBasedPrivateState,
  query: AggregateQuery,
  dataViews: DataViewsPublicPluginStart,
  data: DataPublicPluginStart,
  expressions: ExpressionsStart
) {
  const indexPatternRefs: IndexPatternRef[] = await loadIndexPatternRefs(dataViews);
  const errors: Error[] = [];
  const layerIds = Object.keys(state.layers);
  const context = state.initialContext;
  const newLayerId = layerIds.length > 0 ? layerIds[0] : generateId();
  // fetch the pattern from the query
  const indexPattern = getIndexPatternFromTextBasedQuery(query);
  // get the id of the dataview
  const index = indexPatternRefs.find((r) => r.title === indexPattern)?.id ?? '';
  let columnsFromQuery: DatatableColumn[] = [];
  let allColumns: TextBasedLayerColumn[] = [];
  let timeFieldName;
  try {
    const table = await fetchDataFromAggregateQuery(query, dataViews, data, expressions);
    const dataView = await dataViews.get(index);
    timeFieldName = dataView.timeFieldName;
    columnsFromQuery = table?.columns ?? [];
    allColumns = getAllColumns(state.layers[newLayerId].allColumns, columnsFromQuery);
  } catch (e) {
    errors.push(e);
  }

  const tempState = {
    layers: {
      [newLayerId]: {
        index,
        query,
        columns: state.layers[newLayerId].columns ?? [],
        allColumns,
        timeField: timeFieldName,
        errors,
      },
    },
  };

  return {
    ...tempState,
    fieldList: columnsFromQuery ?? [],
    indexPatternRefs,
    initialContext: context,
  };
}

export function getIndexPatternFromTextBasedQuery(query: AggregateQuery): string {
  let indexPattern = '';
  // sql queries
  if ('sql' in query) {
    indexPattern = getIndexPatternFromSQLQuery(query.sql);
  }
  // other textbased queries....

  return indexPattern;
}
