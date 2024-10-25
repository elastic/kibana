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
import type { XYState, PieVisualizationState } from '.';

interface SuggestionsApiProps {
  context: VisualizeFieldContext | VisualizeEditorContext;
  dataView: DataView;
  visualizationMap?: VisualizationMap;
  datasourceMap?: DatasourceMap;
  excludedVisualizations?: string[];
  preferredChartType?: ChartType;
  preferredVisAttributes?: TypedLensByValueInput['attributes'];
}

const findPreferredSuggestion = ({
  suggestionsList,
  visAttributes,
}: {
  suggestionsList: Suggestion[];
  visAttributes: TypedLensByValueInput['attributes'];
}): Suggestion | undefined => {
  const preferredChartType = visAttributes?.visualizationType;
  if (suggestionsList.length === 1) {
    return suggestionsList[0];
  }

  if (preferredChartType === 'lnsXY') {
    const seriesType = (visAttributes?.state?.visualization as XYState)?.preferredSeriesType;
    const suggestion = suggestionsList.find(
      (s) => (s.visualizationState as XYState).preferredSeriesType === seriesType
    );
    if (suggestion) return suggestion;
  }
  if (preferredChartType === 'lnsPie') {
    const shape = (visAttributes?.state?.visualization as PieVisualizationState)?.shape;
    const suggestion = suggestionsList.find(
      (s) => (s.visualizationState as PieVisualizationState).shape === shape
    );
    if (suggestion) return suggestion;
  }

  return undefined;
};

// ToDo: Move to a new file
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

  // check if there is an XY chart suggested
  // if user has requested for a line or area, we want to sligthly change the state
  // to return line / area instead of a bar chart
  const chartType = preferredChartType?.toLowerCase();
  const XYSuggestion = newSuggestions.find((s) => s.visualizationId === 'lnsXY');
  // a type can be area, line, area_stacked, area_percentage etc
  const isAreaOrLine = ['area', 'line'].some((type) => chartType?.includes(type));
  if (XYSuggestion && chartType && isAreaOrLine) {
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
  if (newSuggestions.length > 1 && preferredChartType) {
    const compatibleSuggestions = newSuggestions.filter(
      (s) => s.title.includes(preferredChartType) || s.visualizationId.includes(preferredChartType)
    );

    if (compatibleSuggestions.length && !preferredVisAttributes) {
      return compatibleSuggestions[0];
    }
    if (compatibleSuggestions.length && preferredVisAttributes) {
      const preferredSuggestion = findPreferredSuggestion({
        visAttributes: preferredVisAttributes,
        suggestionsList: compatibleSuggestions,
      });

      const layersAreEqual = visualizationMap[
        preferredVisAttributes.visualizationType
      ]?.areLayersEqual(
        preferredSuggestion?.visualizationState,
        preferredVisAttributes.state.visualization
      );
      if (preferredSuggestion && !layersAreEqual) {
        const suggestion = mergeSuggestionWithVisContext({
          suggestion: preferredSuggestion,
          visAttributes: preferredVisAttributes,
          context,
        });

        return [suggestion];
      }
    }
  }

  const suggestionsList = [activeVisualization, ...newSuggestions];

  // if there is no preference from the user, send everything
  // until we separate the text based suggestions logic from the dataview one,
  // we want to sort XY first
  const sortXYFirst = suggestionsList.sort((a, b) => (a.visualizationId === 'lnsXY' ? -1 : 1));
  return sortXYFirst;
};
