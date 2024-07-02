/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  getIndexPatternFromESQLQuery,
  getESQLAdHocDataview,
  getESQLQueryColumns,
} from '@kbn/esql-utils';
import type { AggregateQuery } from '@kbn/es-query';
import { getLensAttributesFromSuggestion } from '@kbn/visualization-utils';
import type { DataViewSpec } from '@kbn/data-views-plugin/public';
import type { TypedLensByValueInput } from '../../../embeddable/embeddable_component';
import type { LensPluginStartDependencies } from '../../../plugin';
import type { DatasourceMap, VisualizationMap } from '../../../types';
import { suggestionsApi } from '../../../lens_suggestions_api';

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
    const indexPattern = getIndexPatternFromESQLQuery(query.esql);
    const dataViewSpec = adHocDataViews.find((adHoc) => {
      return adHoc.name === indexPattern;
    });

    const dataView = dataViewSpec
      ? await deps.dataViews.create(dataViewSpec)
      : await getESQLAdHocDataview(indexPattern, deps.dataViews);

    const columns = await getESQLQueryColumns({
      esqlQuery: 'esql' in query ? query.esql : '',
      search: deps.data.search.search,
      signal: abortController?.signal,
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
