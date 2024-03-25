/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { VisualizeFieldContext } from '@kbn/ui-actions-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import { getSuggestions } from './editor_frame_service/editor_frame/suggestion_helpers';
import type { DatasourceMap, VisualizationMap, VisualizeEditorContext } from './types';
import type { DataViewsState } from './state_management';

export enum ChartType {
  XY = 'XY',
  Bar = 'Bar',
  Line = 'Line',
  Area = 'Area',
  Donut = 'Donut',
  Heatmap = 'Heat map',
  Treemap = 'Treemap',
  Tagcloud = 'Tag cloud',
  Waffle = 'Waffle',
  Table = 'Table',
}

interface SuggestionsApiProps {
  context: VisualizeFieldContext | VisualizeEditorContext;
  dataView: DataView;
  visualizationMap?: VisualizationMap;
  datasourceMap?: DatasourceMap;
  excludedVisualizations?: string[];
  preferredChartType?: ChartType;
}

export const suggestionsApi = ({
  context,
  dataView,
  datasourceMap,
  visualizationMap,
  excludedVisualizations,
  preferredChartType,
}: SuggestionsApiProps) => {
  const initialContext = context;
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
  // check if there is an XY chart suggested
  // if user has requested for a line or area, we want to sligthly change the state
  // to return line / area instead of a bar chart
  const chartType = preferredChartType?.toLowerCase();
  const XYSuggestion = suggestions.find((sug) => sug.visualizationId === 'lnsXY');
  if (XYSuggestion && chartType && ['area', 'line'].includes(chartType)) {
    const visualizationState = visualizationMap[
      XYSuggestion.visualizationId
    ]?.switchVisualizationType?.(chartType, XYSuggestion?.visualizationState);
    return [
      {
        ...XYSuggestion,
        visualizationState,
      },
    ];
  }
  // in case the user asks for another type (except from area, line) check if it exists
  // in suggestions and return this instead
  if (suggestions.length > 1 && preferredChartType) {
    const suggestionFromModel = suggestions.find(
      (s) => s.title.includes(preferredChartType) || s.visualizationId.includes(preferredChartType)
    );
    if (suggestionFromModel) {
      return [suggestionFromModel];
    }
  }
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

  // if there is no preference from the user, send everything
  // until we separate the text based suggestions logic from the dataview one,
  // we want to sort XY first
  const sortXYFirst = suggestionsList.sort((a, b) => (a.visualizationId === 'lnsXY' ? -1 : 1));
  return sortXYFirst;
};
