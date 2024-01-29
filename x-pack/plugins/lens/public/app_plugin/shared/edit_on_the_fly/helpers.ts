/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { getIndexPatternFromSQLQuery, getIndexPatternFromESQLQuery } from '@kbn/es-query';
import type { AggregateQuery, Query, Filter } from '@kbn/es-query';
import { fetchFieldsFromESQL } from '@kbn/text-based-editor';
import type { DataView, DataViewSpec } from '@kbn/data-views-plugin/public';
import type { Suggestion } from '../../../types';
import type { TypedLensByValueInput } from '../../../embeddable/embeddable_component';
import type { LensPluginStartDependencies } from '../../../plugin';
import type { DatasourceMap, VisualizationMap } from '../../../types';
import { suggestionsApi } from '../../../lens_suggestions_api';

export const getQueryColumns = async (query: AggregateQuery, deps: LensPluginStartDependencies) => {
  // Fetching only columns for ES|QL for performance reasons with limit 0
  // Important note: ES doesnt return the warnings for 0 limit,
  // I am skipping them in favor of performance now
  // but we should think another way to get them (from Lens embeddable or store)
  const performantQuery = { ...query };
  if ('esql' in performantQuery && performantQuery.esql) {
    performantQuery.esql = `${performantQuery.esql} | limit 0`;
  }
  const table = await fetchFieldsFromESQL(performantQuery, deps.expressions);
  return table?.columns;
};

export const getSuggestions = async (
  query: AggregateQuery,
  deps: LensPluginStartDependencies,
  datasourceMap: DatasourceMap,
  visualizationMap: VisualizationMap,
  adHocDataViews: DataViewSpec[],
  setErrors: (errors: Error[]) => void
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

    const dataView = await deps.dataViews.create(
      dataViewSpec ?? {
        title: indexPattern,
      }
    );
    if (dataView.fields.getByName('@timestamp')?.type === 'date' && !dataViewSpec) {
      dataView.timeFieldName = '@timestamp';
    }
    const columns = await getQueryColumns(query, deps);
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

    const attrs = getLensAttributes({
      filters: [],
      query,
      suggestion: firstSuggestion,
      dataView,
    });
    return attrs;
  } catch (e) {
    setErrors([e]);
  }
  return undefined;
};

export const getLensAttributes = ({
  filters,
  query,
  suggestion,
  dataView,
}: {
  filters: Filter[];
  query: Query | AggregateQuery;
  suggestion: Suggestion | undefined;
  dataView?: DataView;
}) => {
  const suggestionDatasourceState = Object.assign({}, suggestion?.datasourceState);
  const suggestionVisualizationState = Object.assign({}, suggestion?.visualizationState);
  const datasourceStates =
    suggestion && suggestion.datasourceState
      ? {
          [suggestion.datasourceId!]: {
            ...suggestionDatasourceState,
          },
        }
      : {
          formBased: {},
        };
  const visualization = suggestionVisualizationState;
  const attributes = {
    title: suggestion
      ? suggestion.title
      : i18n.translate('xpack.lens.config.suggestion.title', {
          defaultMessage: 'New suggestion',
        }),
    references: [
      {
        id: dataView?.id ?? '',
        name: `textBasedLanguages-datasource-layer-suggestion`,
        type: 'index-pattern',
      },
    ],
    state: {
      datasourceStates,
      filters,
      query,
      visualization,
      ...(dataView &&
        dataView.id &&
        !dataView.isPersisted() && {
          adHocDataViews: { [dataView.id]: dataView.toSpec(false) },
        }),
    },
    visualizationType: suggestion ? suggestion.visualizationId : 'lnsXY',
  } as TypedLensByValueInput['attributes'];
  return attributes;
};
