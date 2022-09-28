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
import { generateId } from '../id_generator';
import { fetchDataFromAggregateQuery } from './fetch_data_from_aggregate_query';

import type {
  IndexPatternRef,
  TextBasedLanguagesPersistedState,
  TextBasedLanguagesLayerColumn,
} from './types';

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

export async function getStateFromAggregateQuery(
  state: TextBasedLanguagesPersistedState,
  query: AggregateQuery,
  dataViews: DataViewsPublicPluginStart,
  data: DataPublicPluginStart,
  expressions: ExpressionsStart
) {
  const indexPatternRefs: IndexPatternRef[] = await loadIndexPatternRefs(dataViews);
  const errors: Error[] = [];
  const layerIds = Object.keys(state.layers);
  const newLayerId = layerIds.length > 0 ? layerIds[0] : generateId();
  // fetch the pattern from the query
  const indexPattern = getIndexPatternFromTextBasedQuery(query);
  // get the id of the dataview
  const index = indexPatternRefs.find((r) => r.title === indexPattern)?.id ?? '';
  let columnsFromQuery: DatatableColumn[] = [];
  let columns: TextBasedLanguagesLayerColumn[] = [];
  let timeFieldName;
  try {
    const table = await fetchDataFromAggregateQuery(query, dataViews, data, expressions);
    const dataView = await dataViews.get(index);
    timeFieldName = dataView.timeFieldName;
    columnsFromQuery = table?.columns ?? [];
    const existingColumns = state.layers[newLayerId].allColumns;
    columns = [
      ...existingColumns,
      ...columnsFromQuery.map((c) => ({ columnId: c.id, fieldName: c.id, meta: c.meta })),
    ];
  } catch (e) {
    errors.push(e);
  }

  const tempState = {
    layers: {
      [newLayerId]: {
        index,
        query,
        columns: state.layers[newLayerId].columns ?? [],
        allColumns: columns,
        timeField: timeFieldName,
        errors,
      },
    },
  };

  return {
    ...tempState,
    fieldList: columnsFromQuery ?? [],
    indexPatternRefs,
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
