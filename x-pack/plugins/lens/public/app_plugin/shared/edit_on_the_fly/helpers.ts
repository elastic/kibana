/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  getIndexPatternFromESQLQuery,
  getESQLAdHocDataview,
  getESQLResults,
  formatESQLColumns,
} from '@kbn/esql-utils';
import type { AggregateQuery } from '@kbn/es-query';
import type { ESQLRow } from '@kbn/es-types';
import { getLensAttributesFromSuggestion } from '@kbn/visualization-utils';
import type { DataViewSpec } from '@kbn/data-views-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import type { TypedLensByValueInput } from '../../../embeddable/embeddable_component';
import type { LensPluginStartDependencies } from '../../../plugin';
import type { DatasourceMap, VisualizationMap } from '../../../types';
import { suggestionsApi } from '../../../lens_suggestions_api';

export interface ESQLDataGridAttrs {
  rows: ESQLRow[];
  dataView: DataView;
  columns: DatatableColumn[];
}

export const getGridAttrs = async (
  query: AggregateQuery,
  adHocDataViews: DataViewSpec[],
  deps: LensPluginStartDependencies,
  abortController?: AbortController
): Promise<ESQLDataGridAttrs> => {
  const indexPattern = getIndexPatternFromESQLQuery(query.esql);
  const dataViewSpec = adHocDataViews.find((adHoc) => {
    return adHoc.name === indexPattern;
  });

  const [results, dataView] = await Promise.all([
    getESQLResults({
      esqlQuery: query.esql,
      search: deps.data.search.search,
      signal: abortController?.signal,
      dropNullColumns: true,
      timeRange: deps.data.query.timefilter.timefilter.getAbsoluteTime(),
    }),
    dataViewSpec
      ? deps.dataViews.create(dataViewSpec)
      : getESQLAdHocDataview(query.esql, deps.dataViews),
  ]);

  const columns = formatESQLColumns(results.response.columns);

  return {
    rows: results.response.values,
    dataView,
    columns,
  };
};

export const getSuggestions = async (
  query: AggregateQuery,
  deps: LensPluginStartDependencies,
  datasourceMap: DatasourceMap,
  visualizationMap: VisualizationMap,
  adHocDataViews: DataViewSpec[],
  setErrors: (errors: Error[]) => void,
  abortController?: AbortController,
  setDataGridAttrs?: (attrs: ESQLDataGridAttrs) => void
) => {
  try {
    const { dataView, columns, rows } = await getGridAttrs(
      query,
      adHocDataViews,
      deps,
      abortController
    );

    setDataGridAttrs?.({
      rows,
      dataView,
      columns,
    });

    const context = {
      dataViewSpec: dataView?.toSpec(false),
      fieldName: '',
      textBasedColumns: columns,
      query,
    };

    const allSuggestions =
      suggestionsApi({ context, dataView, datasourceMap, visualizationMap }) ?? [];

    // Lens might not return suggestions for some cases, i.e. in case of errors
    if (!allSuggestions.length) return undefined;

    const firstSuggestion = allSuggestions[0];

    const attrs = getLensAttributesFromSuggestion({
      filters: [],
      query,
      suggestion: firstSuggestion,
      dataView,
    }) as TypedLensByValueInput['attributes'];
    return attrs;
  } catch (e) {
    setErrors([e]);
  }
  return undefined;
};
