/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getIndexPatternFromSQLQuery, getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
import type { AggregateQuery } from '@kbn/es-query';
import { getESQLAdHocDataview } from '@kbn/esql-utils';
import { getLensAttributesFromSuggestion } from '@kbn/visualization-utils';
import { fetchFieldsFromESQL } from '@kbn/text-based-editor';
import type { DataViewSpec } from '@kbn/data-views-plugin/public';
import type { TypedLensByValueInput } from '../../../embeddable/embeddable_component';
import type { LensPluginStartDependencies } from '../../../plugin';
import type { DatasourceMap, VisualizationMap } from '../../../types';
import { suggestionsApi } from '../../../lens_suggestions_api';

export const getQueryColumns = async (
  query: AggregateQuery,
  deps: LensPluginStartDependencies,
  abortController?: AbortController
) => {
  // Fetching only columns for ES|QL for performance reasons with limit 0
  // Important note: ES doesnt return the warnings for 0 limit,
  // I am skipping them in favor of performance now
  // but we should think another way to get them (from Lens embeddable or store)
  const performantQuery = { ...query };
  if ('esql' in performantQuery && performantQuery.esql) {
    performantQuery.esql = `${performantQuery.esql} | limit 0`;
  }
  const table = await fetchFieldsFromESQL(
    performantQuery,
    deps.expressions,
    undefined,
    abortController
  );
  return table?.columns;
};

export const getSuggestions = async (
  query: AggregateQuery,
  deps: LensPluginStartDependencies,
  datasourceMap: DatasourceMap,
  visualizationMap: VisualizationMap,
  adHocDataViews: DataViewSpec[],
  setErrors: (errors: Error[]) => void,
  abortController?: AbortController
) => {
  try {
    let indexPattern = '';
    if ('sql' in query) {
      indexPattern = getIndexPatternFromSQLQuery(query.sql);
    }
    if ('esql' in query) {
      indexPattern = getIndexPatternFromESQLQuery(query.esql);
    }
    const dataViewSpec = adHocDataViews.find((adHoc) => {
      return adHoc.name === indexPattern;
    });

    const dataView = dataViewSpec
      ? await deps.dataViews.create(dataViewSpec)
      : await getESQLAdHocDataview(indexPattern, deps.dataViews);

    if (dataView.fields.getByName('@timestamp')?.type === 'date' && !dataViewSpec) {
      dataView.timeFieldName = '@timestamp';
    }
    const columns = await getQueryColumns(query, deps, abortController);
    const context = {
      dataViewSpec: dataView?.toSpec(),
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
