/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { VisualizeFieldContext } from '@kbn/ui-actions-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import { getVisualizeFieldSuggestions } from './editor_frame_service/editor_frame/suggestion_helpers';
import type {
  DatasourceMap,
  VisualizationMap,
  VisualizeEditorContext,
  IndexPattern,
} from './types';
import type { DataViewsState } from './state_management';

export interface LensDataViews {
  indexPatterns: Record<string, DataView | IndexPattern>;
  indexPatternRefs: DataViewsState['indexPatternRefs'];
}

interface SuggestionsApi {
  context: VisualizeFieldContext | VisualizeEditorContext;
  dataViews: LensDataViews;
  visualizationMap?: VisualizationMap;
  datasourceMap?: DatasourceMap;
}

export const suggestionsApi = ({
  context,
  dataViews,
  datasourceMap,
  visualizationMap,
}: SuggestionsApi) => {
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
        initialContext: context,
      },
    },
  };
  if (!datasourceMap || !visualizationMap) return undefined;
  return getVisualizeFieldSuggestions({
    datasourceMap,
    datasourceStates,
    visualizationMap,
    visualizeTriggerFieldContext: context,
    dataViews: dataViews as DataViewsState,
  });
};
