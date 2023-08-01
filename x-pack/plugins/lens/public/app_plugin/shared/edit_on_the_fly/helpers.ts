/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { DataView } from '@kbn/data-views-plugin/public';
import type { Datatable } from '@kbn/expressions-plugin/public';
import { getIndexPatternFromSQLQuery, type AggregateQuery } from '@kbn/es-query';
import { fetchDataFromAggregateQuery } from '../../../datasources/text_based/fetch_data_from_aggregate_query';
import type { LensPluginStartDependencies } from '../../../plugin';
import type { DatasourceMap, VisualizationMap } from '../../../types';
import { suggestionsApi } from '../../../lens_suggestions_api';
import { getLensAttributes } from './get_lens_attributes';
import { mapDataToColumns } from './map_to_columns';

export const getLensDataFromQuery = async (
  query: AggregateQuery,
  dataView: DataView,
  deps: LensPluginStartDependencies,
  datasourceMap: DatasourceMap,
  visualizationMap: VisualizationMap,
  datasourceId: 'formBased' | 'textBased',
  setDataTable: (table: Datatable) => void
) => {
  let indexPattern = '';
  if ('sql' in query) {
    indexPattern = getIndexPatternFromSQLQuery(query.sql);
  }
  const dv =
    indexPattern && indexPattern !== dataView.name
      ? await deps.dataViews.create({
          title: indexPattern,
        })
      : dataView;
  const table = await fetchDataFromAggregateQuery(query, dv, deps.data, deps.expressions);
  const columns = table?.columns?.map(({ name }) => name);
  const context = {
    dataViewSpec: dv?.toSpec(),
    fieldName: '',
    contextualFields: columns,
    query,
  };

  const allSuggestions =
    suggestionsApi({ context, dataView, datasourceMap, visualizationMap }) ?? [];
  const firstSuggestion = allSuggestions[0];

  const attrs = getLensAttributes({
    filters: [],
    query,
    dataView: dv,
    suggestion: firstSuggestion,
  });
  if (table) {
    const activeDatasource = datasourceMap[datasourceId];
    const datasourceState = attrs.state.datasourceStates[datasourceId];
    const fields = activeDatasource?.getColumns?.(datasourceState) ?? [];
    const updatedTable = mapDataToColumns(table, fields);
    setDataTable(updatedTable);
  }

  return attrs;
};
