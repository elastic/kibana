/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { Ast } from '@kbn/interpreter/common';
import { IconType } from '@elastic/eui/src/components/icon/icon';
import { Datatable } from 'src/plugins/expressions';
import { PaletteOutput } from 'src/plugins/charts/public';
import { VisualizeFieldContext } from '../../../../../../src/plugins/ui_actions/public';
import {
  Visualization,
  Datasource,
  TableChangeType,
  TableSuggestion,
  DatasourceSuggestion,
} from '../../types';
import { Action } from './state_management';

export interface Suggestion {
  visualizationId: string;
  datasourceState?: unknown;
  datasourceId?: string;
  columns: number;
  score: number;
  title: string;
  visualizationState: unknown;
  previewExpression?: Ast | string;
  previewIcon: IconType;
  hide?: boolean;
  changeType: TableChangeType;
  keptLayerIds: string[];
}

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
  activeVisualizationId,
  subVisualizationId,
  visualizationState,
  field,
  visualizeTriggerFieldContext,
  activeData,
  mainPalette,
}: {
  datasourceMap: Record<string, Datasource>;
  datasourceStates: Record<
    string,
    {
      isLoading: boolean;
      state: unknown;
    }
  >;
  visualizationMap: Record<string, Visualization>;
  activeVisualizationId: string | null;
  subVisualizationId?: string;
  visualizationState: unknown;
  field?: unknown;
  visualizeTriggerFieldContext?: VisualizeFieldContext;
  activeData?: Record<string, Datatable>;
  mainPalette?: PaletteOutput;
}): Suggestion[] {
  const datasources = Object.entries(datasourceMap).filter(
    ([datasourceId]) => datasourceStates[datasourceId] && !datasourceStates[datasourceId].isLoading
  );

  // Collect all table suggestions from available datasources
  const datasourceTableSuggestions = _.flatten(
    datasources.map(([datasourceId, datasource]) => {
      const datasourceState = datasourceStates[datasourceId].state;
      let dataSourceSuggestions;
      if (visualizeTriggerFieldContext) {
        dataSourceSuggestions = datasource.getDatasourceSuggestionsForVisualizeField(
          datasourceState,
          visualizeTriggerFieldContext.indexPatternId,
          visualizeTriggerFieldContext.fieldName
        );
      } else if (field) {
        dataSourceSuggestions = datasource.getDatasourceSuggestionsForField(datasourceState, field);
      } else {
        dataSourceSuggestions = datasource.getDatasourceSuggestionsFromCurrentState(
          datasourceState,
          activeData
        );
      }
      return dataSourceSuggestions.map((suggestion) => ({ ...suggestion, datasourceId }));
    })
  );

  // Pass all table suggestions to all visualization extensions to get visualization suggestions
  // and rank them by score
  return _.flatten(
    Object.entries(visualizationMap).map(([visualizationId, visualization]) =>
      _.flatten(
        datasourceTableSuggestions.map((datasourceSuggestion) => {
          const table = datasourceSuggestion.table;
          const currentVisualizationState =
            visualizationId === activeVisualizationId ? visualizationState : undefined;
          const palette =
            mainPalette ||
            (activeVisualizationId &&
            visualizationMap[activeVisualizationId] &&
            visualizationMap[activeVisualizationId].getMainPalette
              ? visualizationMap[activeVisualizationId].getMainPalette!(visualizationState)
              : undefined);
          return getVisualizationSuggestions(
            visualization,
            table,
            visualizationId,
            datasourceSuggestion,
            currentVisualizationState,
            subVisualizationId,
            palette
          );
        })
      )
    )
  ).sort((a, b) => b.score - a.score);
}

export function applyVisualizeFieldSuggestions({
  datasourceMap,
  datasourceStates,
  visualizationMap,
  activeVisualizationId,
  visualizationState,
  visualizeTriggerFieldContext,
  dispatch,
}: {
  datasourceMap: Record<string, Datasource>;
  datasourceStates: Record<
    string,
    {
      isLoading: boolean;
      state: unknown;
    }
  >;
  visualizationMap: Record<string, Visualization>;
  activeVisualizationId: string | null;
  subVisualizationId?: string;
  visualizationState: unknown;
  visualizeTriggerFieldContext?: VisualizeFieldContext;
  dispatch: (action: Action) => void;
}): void {
  const suggestions = getSuggestions({
    datasourceMap,
    datasourceStates,
    visualizationMap,
    activeVisualizationId,
    visualizationState,
    visualizeTriggerFieldContext,
  });
  if (suggestions.length) {
    const selectedSuggestion =
      suggestions.find((s) => s.visualizationId === activeVisualizationId) || suggestions[0];
    switchToSuggestion(dispatch, selectedSuggestion, 'SWITCH_VISUALIZATION');
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
  mainPalette?: PaletteOutput
) {
  return visualization
    .getSuggestions({
      table,
      state: currentVisualizationState,
      keptLayerIds: datasourceSuggestion.keptLayerIds,
      subVisualizationId,
      mainPalette,
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
  dispatch: (action: Action) => void,
  suggestion: Pick<
    Suggestion,
    'visualizationId' | 'visualizationState' | 'datasourceState' | 'datasourceId'
  >,
  type: 'SWITCH_VISUALIZATION' | 'SELECT_SUGGESTION' = 'SELECT_SUGGESTION'
) {
  const action: Action = {
    type,
    newVisualizationId: suggestion.visualizationId,
    initialState: suggestion.visualizationState,
    datasourceState: suggestion.datasourceState,
    datasourceId: suggestion.datasourceId!,
  };

  dispatch(action);
}
