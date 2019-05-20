/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Action } from '../state_management';
import {
  Datasource,
  Visualization,
  DatasourcePublicAPI,
  DatasourceSuggestion,
  DimensionRole,
  TableColumn,
} from '../../types';
import { DragDrop } from '../../drag_drop';

interface WorkspacePanelProps {
  activeDatasource: Datasource;
  datasourceState: unknown;
  activeVisualizationId: string | null;
  visualizations: Record<string, Visualization>;
  visualizationState: unknown;
  datasourcePublicAPI: DatasourcePublicAPI;
  dispatch: (action: Action) => void;
}

interface ExpressionRendererProps {
  expression: string;
}

function ExpressionRenderer(props: ExpressionRendererProps) {
  // TODO: actually render the expression and move this to a generic folder as it can be re-used for
  // suggestion rendering
  return <span>{props.expression}</span>;
}

export function WorkspacePanel(props: WorkspacePanelProps) {
  const currentDatasource = props.activeDatasource;
  const expression = props.activeVisualizationId
    ? `${props.activeDatasource.toExpression(props.datasourceState)} | ${props.visualizations[
        props.activeVisualizationId
      ].toExpression(props.visualizationState, props.datasourcePublicAPI)}`
    : null;
  return (
    <DragDrop
      draggable={false}
      droppable={true}
      onDrop={() => {
        const datasourceSuggestions = currentDatasource.getDatasourceSuggestionsForField(
          props.datasourceState
        );
        const roleMapping = props.activeVisualizationId
          ? props.visualizations[props.activeVisualizationId].getMappingOfTableToRoles(
              props.visualizationState,
              props.datasourcePublicAPI
            )
          : [];
        const suggestion = getSuggestions(
          datasourceSuggestions,
          props.visualizations,
          roleMapping
        )[0];
        // TODO heuristically present the suggestions in a modal instead of just picking the first one
        props.dispatch({
          type: 'SWITCH_VISUALIZATION',
          newVisulizationId: suggestion.visualizationId,
          initialState: suggestion.state,
          datasourceState: suggestion.datasourceState,
        });
      }}
    >
      {expression !== null ? (
        <ExpressionRenderer expression={expression} />
      ) : (
        <p>{/* TODO: I18N */}This is the workspace panel. Drop fields here</p>
      )}
    </DragDrop>
  );
}

function getSuggestions(
  datasourceTableSuggestions: DatasourceSuggestion[],
  visualizations: Record<string, Visualization>,
  currentColumnRoles: DimensionRole[]
) {
  const datasourceTableMetas: Record<string, TableColumn[]> = {};
  datasourceTableSuggestions.map(({ tableColumns }, datasourceSuggestionId) => {
    datasourceTableMetas[datasourceSuggestionId] = tableColumns;
  });

  return (
    Object.entries(visualizations)
      .map(([visualizationId, visualization]) => {
        return visualization
          .getSuggestions({
            tableColumns: datasourceTableMetas,
            roles: currentColumnRoles,
          })
          .map(({ datasourceSuggestionId, ...suggestion }) => ({
            ...suggestion,
            visualizationId,
            datasourceState: datasourceTableSuggestions[datasourceSuggestionId].state,
          }));
      })
      // TODO why is flatMap not available here?
      .reduce((globalList, currentList) => [...globalList, ...currentList], [])
      .sort(({ score: scoreA }, { score: scoreB }) => scoreB - scoreA)
  );
}
