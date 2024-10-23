/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { VisualizeFieldContext } from '@kbn/ui-actions-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { ChartType } from '@kbn/visualization-utils';
import { getSuggestions } from './editor_frame_service/editor_frame/suggestion_helpers';
import type { DatasourceMap, VisualizationMap, VisualizeEditorContext, Suggestion } from './types';
import type { DataViewsState } from './state_management';
import type { TypedLensByValueInput } from './embeddable/embeddable_component';

interface SuggestionsApiProps {
  context: VisualizeFieldContext | VisualizeEditorContext;
  dataView: DataView;
  visualizationMap?: VisualizationMap;
  datasourceMap?: DatasourceMap;
  excludedVisualizations?: string[];
  preferredChartType?: ChartType;
  preferredVisAttributes?: TypedLensByValueInput['attributes'];
}

function mergeSuggestionWithVisContext({
  suggestion,
  visAttributes,
  context,
}: {
  suggestion: Suggestion;
  visAttributes: TypedLensByValueInput['attributes'];
  context: VisualizeFieldContext | VisualizeEditorContext;
}): Suggestion {
  if (
    visAttributes.visualizationType !== suggestion.visualizationId ||
    !('textBasedColumns' in context)
  ) {
    return suggestion;
  }

  // it should be one of 'formBased'/'textBased' and have value
  const datasourceId: 'formBased' | 'textBased' | undefined = [
    'formBased' as const,
    'textBased' as const,
  ].find((key) => Boolean(visAttributes.state.datasourceStates[key]));

  // if the datasource is formBased, we should not merge
  if (!datasourceId || datasourceId === 'formBased') {
    return suggestion;
  }
  const datasourceState = Object.assign({}, visAttributes.state.datasourceStates[datasourceId]);

  // should be based on same columns
  if (
    !datasourceState?.layers ||
    Object.values(datasourceState?.layers).some((layer) =>
      layer.columns?.some(
        // unknown column
        (c: { fieldName: string }) =>
          !context?.textBasedColumns?.find((col) => col.name === c.fieldName)
      )
    )
  ) {
    return suggestion;
  }

  try {
    return {
      ...suggestion,
      datasourceState,
      visualizationState: visAttributes.state.visualization,
      datasourceId,
    };
  } catch {
    return suggestion;
  }
}

export const suggestionsApi = ({
  context,
  dataView,
  datasourceMap,
  visualizationMap,
  excludedVisualizations,
  preferredChartType,
  preferredVisAttributes,
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
  console.dir(suggestions);
  // a type can be area, line, area_stacked, area_percentage etc
  const isAreaOrLine = ['area', 'line'].some((type) => chartType?.includes(type));
  if (XYSuggestion && chartType && isAreaOrLine) {
    const visualizationState = visualizationMap[
      XYSuggestion.visualizationId
    ]?.switchVisualizationType?.(chartType, XYSuggestion?.visualizationState);

    const updatedSuggestion = {
      ...XYSuggestion,
      visualizationState,
    };

    return [
      preferredVisAttributes
        ? mergeSuggestionWithVisContext({
            suggestion: updatedSuggestion,
            visAttributes: preferredVisAttributes,
            context,
          })
        : updatedSuggestion,
    ];
  }
  // in case the user asks for another type (except from area, line) check if it exists
  // in suggestions and return this instead
  if (suggestions.length > 1 && preferredChartType && !preferredVisAttributes) {
    const suggestionFromModel = suggestions.find(
      (s) => s.title.includes(preferredChartType) || s.visualizationId.includes(preferredChartType)
    );
    if (suggestionFromModel) {
      return [suggestionFromModel];
    }
  }

  if (suggestions.length > 1 && preferredChartType && preferredVisAttributes) {
    const suggestionFromModel = suggestions.find(
      (s) => s.title.includes(preferredChartType) || s.visualizationId.includes(preferredChartType)
    );
    if (suggestionFromModel) {
      return [
        mergeSuggestionWithVisContext({
          suggestion: suggestionFromModel,
          visAttributes: preferredVisAttributes,
          context,
        }),
      ];
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
