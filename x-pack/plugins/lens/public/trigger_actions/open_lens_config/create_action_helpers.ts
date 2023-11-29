/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { createGetterSetter } from '@kbn/kibana-utils-plugin/common';
import type { Datasource, Visualization } from '../../types';
import type { LensPluginStartDependencies } from '../../plugin';
import { fetchDataFromAggregateQuery } from '../../datasources/text_based/fetch_data_from_aggregate_query';
import { suggestionsApi } from '../../lens_suggestions_api';

// datasourceMap and visualizationMap setters/getters
export const [getVisualizationMap, setVisualizationMap] = createGetterSetter<
  Record<string, Visualization<unknown, unknown, unknown>>
>('VisualizationMap', false);

export const [getDatasourceMap, setDatasourceMap] = createGetterSetter<
  Record<string, Datasource<unknown, unknown>>
>('DatasourceMap', false);

export async function executeCreateAction({ deps }: { deps: LensPluginStartDependencies }) {
  const visualizationMap = getVisualizationMap();
  const datasourceMap = getDatasourceMap();

  // const embeddableStart = this.startDependencies.embeddable;
  // const factory = embeddableStart.getEmbeddableFactory('lens')!;
  // console.dir(this.startDependencies);
  const defaultDataView = await deps.dataViews.getDefaultDataView({
    displayErrors: false,
  });
  if (!defaultDataView) {
    return undefined;
  }
  const defaultEsqlQuery = {
    esql: `from ${defaultDataView?.getIndexPattern()} | limit 10`,
  };

  const performantQuery = {
    esql: `from ${defaultDataView?.getIndexPattern()} | limit 0`,
  };

  const table = await fetchDataFromAggregateQuery(
    performantQuery,
    defaultDataView,
    deps.data,
    deps.expressions
  );

  const context = {
    dataViewSpec: defaultDataView?.toSpec(),
    fieldName: '',
    textBasedColumns: table?.columns,
    query: defaultEsqlQuery,
  };

  const allSuggestions =
    suggestionsApi({ context, dataView: defaultDataView, datasourceMap, visualizationMap }) ?? [];

  // Lens might not return suggestions for some cases, i.e. in case of errors
  if (!allSuggestions.length) return undefined;

  // get the initial attributes from the suggestions api
  // create a new embeddable with factory.create
  // factory?.create()
}
