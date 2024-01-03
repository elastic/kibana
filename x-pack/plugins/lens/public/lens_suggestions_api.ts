/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { VisualizeFieldContext } from '@kbn/ui-actions-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import { DataDocuments$ } from '@kbn/discover-plugin/public/application/main/services/discover_data_state_container';
import { TextBasedPersistedState } from './datasources/text_based/types';
import { getSuggestions } from './editor_frame_service/editor_frame/suggestion_helpers';
import type { DatasourceMap, VisualizationMap, VisualizeEditorContext } from './types';
import type { DataViewsState } from './state_management';

interface SuggestionsApi {
  context: (VisualizeFieldContext | VisualizeEditorContext) & { documents$?: DataDocuments$ };
  dataView: DataView;
  visualizationMap?: VisualizationMap;
  datasourceMap?: DatasourceMap;
  excludedVisualizations?: string[];
}

export const suggestionsApi = ({
  context,
  dataView,
  datasourceMap,
  visualizationMap,
  excludedVisualizations,
}: SuggestionsApi) => {
  const { documents$, ...initialContext } = context;
  if (!datasourceMap || !visualizationMap || !dataView.id) return undefined;
  const datasourceStates = {
    formBased: {
      isLoading: false,
      state: {
        layers: {},
      },
    },
    textBased: {
      isLoading: false,
      state: {
        layers: {},
        fieldList: [],
        indexPatternRefs: [],
        initialContext,
      },
    },
  };
  const currentDataViewId = dataView.id;
  const dataViews = {
    indexPatterns: {
      [currentDataViewId]: dataView,
    },
    indexPatternRefs: [],
  } as unknown as DataViewsState;

  const initialVisualization = visualizationMap?.[Object.keys(visualizationMap)[0]] || null;

  // find the active visualizations from the context
  const suggestions = getSuggestions({
    datasourceMap,
    datasourceStates,
    visualizationMap,
    activeVisualization: initialVisualization,
    visualizationState: undefined,
    visualizeTriggerFieldContext: context,
    dataViews,
  });
  if (!suggestions.length) return [];
  const activeVisualization = suggestions[0];
  if (
    activeVisualization.incomplete ||
    excludedVisualizations?.includes(activeVisualization.visualizationId)
  ) {
    return [];
  }
  // compute the rest suggestions depending on the active one and filter out the lnsLegacyMetric
  const newSuggestions = getSuggestions({
    datasourceMap,
    datasourceStates: {
      textBased: {
        isLoading: false,
        state: activeVisualization.datasourceState,
      },
    },
    visualizationMap,
    activeVisualization: visualizationMap[activeVisualization.visualizationId],
    visualizationState: activeVisualization.visualizationState,
    dataViews,
  }).filter((sug) => !sug.hide && sug.visualizationId !== 'lnsLegacyMetric');
  const suggestionsList = [activeVisualization, ...newSuggestions];
  // until we separate the text based suggestions logic from the dataview one,
  // we want to sort XY first
  const sortXYFirst = suggestionsList.sort((a, b) => (a.visualizationId === 'lnsXY' ? -1 : 1));

  if (documents$?.value) {
    sortXYFirst.forEach((suggestion) => {
      const { layers } = suggestion.datasourceState as TextBasedPersistedState;
      Object.keys(layers).forEach((key) => {
        const layer = layers[key];
        layer.table = {
          type: 'datatable',
          rows: documents$.value.result!.map((r) => r.raw),
          columns: documents$.value.textBasedQueryColumns!,
        };
      });
    });
  }
  return sortXYFirst;
};
