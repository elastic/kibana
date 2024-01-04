/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';

import {
  type AggregateQuery,
  getIndexPatternFromSQLQuery,
  getIndexPatternFromESQLQuery,
} from '@kbn/es-query';
import type { DatatableColumn } from '@kbn/expressions-plugin/public';
import { generateId } from '../../id_generator';
import { fetchDataFromAggregateQuery } from './fetch_data_from_aggregate_query';

import type { IndexPatternRef, TextBasedPrivateState, TextBasedLayerColumn } from './types';
import type { DataViewsState } from '../../state_management';

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
    const dataView = await dataViews.create({
      title: indexPattern,
    });
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
  if ('esql' in query) {
    indexPattern = getIndexPatternFromESQLQuery(query.esql);
  }
  // other textbased queries....

  return indexPattern;
}

export function canColumnBeDroppedInMetricDimension(
  columns: TextBasedLayerColumn[] | DatatableColumn[],
  selectedColumnType?: string
): boolean {
  // check if at least one numeric field exists
  const hasNumberTypeColumns = columns?.some((c) => c?.meta?.type === 'number');
  return !hasNumberTypeColumns || (hasNumberTypeColumns && selectedColumnType === 'number');
}

export function canColumnBeUsedBeInMetricDimension(
  columns: TextBasedLayerColumn[] | DatatableColumn[],
  selectedColumnType?: string
): boolean {
  // check if at least one numeric field exists
  const hasNumberTypeColumns = columns?.some((c) => c?.meta?.type === 'number');
  return (
    !hasNumberTypeColumns ||
    columns.length >= MAX_NUM_OF_COLUMNS ||
    (hasNumberTypeColumns && selectedColumnType === 'number')
  );
}
