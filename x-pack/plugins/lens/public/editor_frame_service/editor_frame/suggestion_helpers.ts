/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Datatable } from '@kbn/expressions-plugin';
import type { PaletteOutput } from '@kbn/coloring';
import { VisualizeFieldContext } from '@kbn/ui-actions-plugin/public';
import {
  Visualization,
  Datasource,
  TableSuggestion,
  DatasourceSuggestion,
  DatasourceMap,
  VisualizationMap,
  VisualizeEditorContext,
  Suggestion,
  DatasourceLayers,
} from '../../types';
import { DragDropIdentifier } from '../../drag_drop';
import { LayerType, layerTypes } from '../../../common';
import { getLayerType } from './config_panel/add_layer';
import {
  LensDispatch,
  switchVisualization,
  DatasourceStates,
  VisualizationState,
  applyChanges,
} from '../../state_management';

/**
 * This function takes a list of available data tables and a list of visualization
 * extensions and creates a ranked list of suggestions which contain a pair of a data table
 * and a visualization.
 *
 * Each suggestion represents a valid state of the editor and can be applied by creating an
 * action with `toSwitchAction` and dispatching it
 */
export function getSuggestions({
  datasourceMap,
  datasourceStates,
  visualizationMap,
  activeVisualization,
  subVisualizationId,
  visualizationState,
  field,
  visualizeTriggerFieldContext,
  activeData,
  mainPalette,
}: {
  datasourceMap: DatasourceMap;
  datasourceStates: DatasourceStates;
  visualizationMap: VisualizationMap;
  activeVisualization?: Visualization;
  subVisualizationId?: string;
  visualizationState: unknown;
  field?: unknown;
  visualizeTriggerFieldContext?: VisualizeFieldContext | VisualizeEditorContext;
  activeData?: Record<string, Datatable>;
  mainPalette?: PaletteOutput;
}): Suggestion[] {
  const datasources = Object.entries(datasourceMap).filter(
    ([datasourceId]) => datasourceStates[datasourceId] && !datasourceStates[datasourceId].isLoading
  );

  const layerTypesMap = datasources.reduce((memo, [datasourceId, datasource]) => {
    const datasourceState = datasourceStates[datasourceId].state;
    if (!activeVisualization || !datasourceState) {
      return memo;
    }
    const layers = datasource.getLayers(datasourceState);
    for (const layerId of layers) {
      const type = getLayerType(activeVisualization, visualizationState, layerId);
      memo[layerId] = type;
    }
    return memo;
  }, {} as Record<string, LayerType>);

  const isLayerSupportedByVisualization = (layerId: string, supportedTypes: LayerType[]) =>
    supportedTypes.includes(layerTypesMap[layerId] ?? layerTypes.DATA);

  // Collect all table suggestions from available datasources
  const datasourceTableSuggestions = datasources.flatMap(([datasourceId, datasource]) => {
    const datasourceState = datasourceStates[datasourceId].state;
    let dataSourceSuggestions;
    // context is used to pass the state from location to datasource
    if (visualizeTriggerFieldContext) {
      // used for navigating from VizEditor to Lens
      if ('isVisualizeAction' in visualizeTriggerFieldContext) {
        dataSourceSuggestions = datasource.getDatasourceSuggestionsForVisualizeCharts(
          datasourceState,
          visualizeTriggerFieldContext.layers
        );
      } else {
        // used for navigating from Discover to Lens
        dataSourceSuggestions = datasource.getDatasourceSuggestionsForVisualizeField(
          datasourceState,
          visualizeTriggerFieldContext.indexPatternId,
          visualizeTriggerFieldContext.fieldName
        );
      }
    } else if (field) {
      dataSourceSuggestions = datasource.getDatasourceSuggestionsForField(
        datasourceState,
        field,
        (layerId) => isLayerSupportedByVisualization(layerId, [layerTypes.DATA]) // a field dragged to workspace should added to data layer
      );
    } else {
      dataSourceSuggestions = datasource.getDatasourceSuggestionsFromCurrentState(
        datasourceState,
        (layerId) => isLayerSupportedByVisualization(layerId, [layerTypes.DATA]),
        activeData
      );
    }
    return dataSourceSuggestions.map((suggestion) => ({ ...suggestion, datasourceId }));
  });
  // Pass all table suggestions to all visualization extensions to get visualization suggestions
  // and rank them by score
  return Object.entries(visualizationMap)
    .flatMap(([visualizationId, visualization]) => {
      const supportedLayerTypes = visualization.getSupportedLayers().map(({ type }) => type);
      return datasourceTableSuggestions
        .filter((datasourceSuggestion) => {
          const filteredCount = datasourceSuggestion.keptLayerIds.filter((layerId) =>
            isLayerSupportedByVisualization(layerId, supportedLayerTypes)
          ).length;
          // make it pass either suggestions with some ids left after filtering
          // or suggestion with already 0 ids before the filtering (testing purposes)
          return filteredCount || filteredCount === datasourceSuggestion.keptLayerIds.length;
        })
        .flatMap((datasourceSuggestion) => {
          const table = datasourceSuggestion.table;
          const currentVisualizationState =
            visualizationId === activeVisualization?.id ? visualizationState : undefined;
          const palette = mainPalette || activeVisualization?.getMainPalette?.(visualizationState);

          return getVisualizationSuggestions(
            visualization,
            table,
            visualizationId,
            {
              ...datasourceSuggestion,
              keptLayerIds: datasourceSuggestion.keptLayerIds.filter((layerId) =>
                isLayerSupportedByVisualization(layerId, supportedLayerTypes)
              ),
            },
            currentVisualizationState,
            subVisualizationId,
            palette,
            visualizeTriggerFieldContext && 'isVisualizeAction' in visualizeTriggerFieldContext,
            activeData
          );
        });
    })
    .sort((a, b) => b.score - a.score);
}

export function getVisualizeFieldSuggestions({
  datasourceMap,
  datasourceStates,
  visualizationMap,
  visualizeTriggerFieldContext,
}: {
  datasourceMap: DatasourceMap;
  datasourceStates: DatasourceStates;
  visualizationMap: VisualizationMap;
  subVisualizationId?: string;
  visualizeTriggerFieldContext?: VisualizeFieldContext | VisualizeEditorContext;
}): Suggestion | undefined {
  const activeVisualization = visualizationMap?.[Object.keys(visualizationMap)[0]] || null;
  const suggestions = getSuggestions({
    datasourceMap,
    datasourceStates,
    visualizationMap,
    activeVisualization,
    visualizationState: undefined,
    visualizeTriggerFieldContext,
  });

  if (visualizeTriggerFieldContext && 'isVisualizeAction' in visualizeTriggerFieldContext) {
    const allSuggestions = suggestions.filter(
      (s) => s.visualizationId === visualizeTriggerFieldContext.type
    );
    return activeVisualization?.getVisualizationSuggestionFromContext?.({
      suggestions: allSuggestions,
      context: visualizeTriggerFieldContext,
    });
  }

  if (suggestions.length) {
    return suggestions.find((s) => s.visualizationId === activeVisualization?.id) || suggestions[0];
  }
}

/**
 * Queries a single visualization extensions for a single datasource suggestion and
 * creates an array of complete suggestions containing both the target datasource
 * state and target visualization state along with suggestion meta data like score,
 * title and preview expression.
 */
function getVisualizationSuggestions(
  visualization: Visualization<unknown>,
  table: TableSuggestion,
  visualizationId: string,
  datasourceSuggestion: DatasourceSuggestion & { datasourceId: string },
  currentVisualizationState: unknown,
  subVisualizationId?: string,
  mainPalette?: PaletteOutput,
  isFromContext?: boolean,
  activeData?: Record<string, Datatable>
) {
  return visualization
    .getSuggestions({
      table,
      state: currentVisualizationState,
      keptLayerIds: datasourceSuggestion.keptLayerIds,
      subVisualizationId,
      mainPalette,
      isFromContext,
      activeData,
    })
    .map(({ state, ...visualizationSuggestion }) => ({
      ...visualizationSuggestion,
      visualizationId,
      visualizationState: state,
      keptLayerIds: datasourceSuggestion.keptLayerIds,
      datasourceState: datasourceSuggestion.state,
      datasourceId: datasourceSuggestion.datasourceId,
      columns: table.columns.length,
      changeType: table.changeType,
    }));
}

export function switchToSuggestion(
  dispatchLens: LensDispatch,
  suggestion: Pick<
    Suggestion,
    'visualizationId' | 'visualizationState' | 'datasourceState' | 'datasourceId'
  >,
  options?: {
    clearStagedPreview?: boolean;
    applyImmediately?: boolean;
  }
) {
  dispatchLens(
    switchVisualization({
      suggestion: {
        newVisualizationId: suggestion.visualizationId,
        visualizationState: suggestion.visualizationState,
        datasourceState: suggestion.datasourceState,
        datasourceId: suggestion.datasourceId!,
      },
      clearStagedPreview: options?.clearStagedPreview,
    })
  );
  if (options?.applyImmediately) {
    dispatchLens(applyChanges());
  }
}

export function getTopSuggestionForField(
  datasourceLayers: DatasourceLayers,
  visualization: VisualizationState,
  datasourceStates: DatasourceStates,
  visualizationMap: Record<string, Visualization<unknown>>,
  datasource: Datasource,
  field: DragDropIdentifier
) {
  const hasData = Object.values(datasourceLayers).some(
    (datasourceLayer) => datasourceLayer.getTableSpec().length > 0
  );

  const activeVisualization = visualization.activeId
    ? visualizationMap[visualization.activeId]
    : undefined;

  const mainPalette = activeVisualization?.getMainPalette?.(visualization.state);
  const suggestions = getSuggestions({
    datasourceMap: { [datasource.id]: datasource },
    datasourceStates,
    visualizationMap:
      hasData && visualization.activeId
        ? { [visualization.activeId]: activeVisualization! }
        : visualizationMap,
    activeVisualization,
    visualizationState: visualization.state,
    field,
    mainPalette,
  });
  return (
    suggestions.find((s) => s.visualizationId === visualization.activeId) ||
    suggestions.filter((suggestion) => !suggestion.hide)[0] ||
    suggestions[0]
  );
}
