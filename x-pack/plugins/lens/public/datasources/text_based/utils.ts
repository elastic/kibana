/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import { getESQLAdHocDataview } from '@kbn/esql-utils';
import type { AggregateQuery } from '@kbn/es-query';
import { getIndexPatternFromSQLQuery, getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
import type { DatatableColumn } from '@kbn/expressions-plugin/public';
import { generateId } from '../../id_generator';
import { fetchDataFromAggregateQuery } from './fetch_data_from_aggregate_query';
import type { IndexPatternRef, TextBasedPrivateState, TextBasedLayerColumn } from './types';
import type { DataViewsState } from '../../state_management';
import { addColumnsToCache } from './fieldlist_cache';

export const MAX_NUM_OF_COLUMNS = 5;

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
  expressions: ExpressionsStart,
  frameDataViews?: DataViewsState
) {
  let indexPatternRefs: IndexPatternRef[] = frameDataViews?.indexPatternRefs.length
    ? frameDataViews.indexPatternRefs
    : await loadIndexPatternRefs(dataViews);
  const errors: Error[] = [];
  const layerIds = Object.keys(state.layers);
  const context = state.initialContext;
  const newLayerId = layerIds.length > 0 ? layerIds[0] : generateId();
  // fetch the pattern from the query
  const indexPattern = getIndexPatternFromTextBasedQuery(query);
  // get the id of the dataview
  let dataViewId = indexPatternRefs.find((r) => r.title === indexPattern)?.id ?? '';
  let columnsFromQuery: DatatableColumn[] = [];
  let timeFieldName;
  try {
    const dataView = await getESQLAdHocDataview(indexPattern, dataViews);

    if (dataView && dataView.id) {
      if (dataView?.fields?.getByName('@timestamp')?.type === 'date') {
        dataView.timeFieldName = '@timestamp';
      }
      dataViewId = dataView?.id;
      indexPatternRefs = [
        ...indexPatternRefs,
        {
          id: dataView.id,
          title: dataView.name,
          timeField: dataView.timeFieldName,
        },
      ];
    }
    timeFieldName = dataView.timeFieldName;
    const table = await fetchDataFromAggregateQuery(query, dataView, data, expressions);
    columnsFromQuery = table?.columns ?? [];
    addColumnsToCache(query, columnsFromQuery);
  } catch (e) {
    errors.push(e);
  }

  const tempState = {
    layers: {
      [newLayerId]: {
        index: dataViewId,
        query,
        columns: state.layers[newLayerId].columns ?? [],
        timeField: timeFieldName,
        errors,
      },
    },
  };

  return {
    ...tempState,
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
  if ('esql' in query) {
    indexPattern = getIndexPatternFromESQLQuery(query.esql);
  }
  // other textbased queries....

  return indexPattern;
}

export const isNumeric = (column: TextBasedLayerColumn | DatatableColumn) =>
  column?.meta?.type === 'number';
export const isNotNumeric = (column: TextBasedLayerColumn | DatatableColumn) => !isNumeric(column);

export function canColumnBeDroppedInMetricDimension(
  columns: TextBasedLayerColumn[] | DatatableColumn[],
  selectedColumnType?: string
): boolean {
  // check if at least one numeric field exists
  const hasNumberTypeColumns = columns?.some(isNumeric);
  return !hasNumberTypeColumns || (hasNumberTypeColumns && selectedColumnType === 'number');
}

export function canColumnBeUsedBeInMetricDimension(
  columns: TextBasedLayerColumn[] | DatatableColumn[],
  selectedColumnType?: string
): boolean {
  // check if at least one numeric field exists
  const hasNumberTypeColumns = columns?.some(isNumeric);
  return (
    !hasNumberTypeColumns ||
    columns.length >= MAX_NUM_OF_COLUMNS ||
    (hasNumberTypeColumns && selectedColumnType === 'number')
  );
}
