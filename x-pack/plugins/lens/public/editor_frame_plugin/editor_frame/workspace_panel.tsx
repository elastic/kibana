/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Action } from './state_management';
import { Datasource, Visualization, DatasourcePublicAPI } from '../../types';
import { DragDrop } from '../../drag_drop';
import { getSuggestions, toSwitchAction } from './suggestion_helpers';

interface WorkspacePanelProps {
  activeDatasource: Datasource;
  datasourceState: unknown;
  activeVisualizationId: string | null;
  visualizationMap: Record<string, Visualization>;
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

export function WorkspacePanel({
  activeDatasource,
  activeVisualizationId,
  datasourceState,
  visualizationMap,
  visualizationState,
  datasourcePublicAPI,
  dispatch,
}: WorkspacePanelProps) {
  function onDrop() {
    const datasourceSuggestions = activeDatasource.getDatasourceSuggestionsForField(
      datasourceState
    );

    const suggestions = getSuggestions(
      datasourceSuggestions,
      visualizationMap,
      activeVisualizationId,
      visualizationState,
      datasourcePublicAPI
    );

    if (suggestions.length === 0) {
      // TODO specify and implement behavior in case
      // of no valid suggestions
      return;
    }

    const suggestion = suggestions[0];

    // TODO heuristically present the suggestions in a modal instead of just picking the first one
    dispatch(toSwitchAction(suggestion));
  }

  function renderVisualization() {
    if (activeVisualizationId === null) {
      return <p>{/* TODO: I18N */}This is the workspace panel. Drop fields here</p>;
    }

    const activeVisualization = visualizationMap[activeVisualizationId];
    const datasourceExpression = activeDatasource.toExpression(datasourceState);
    const visualizationExpression = activeVisualization.toExpression(
      visualizationState,
      datasourcePublicAPI
    );
    const expression = `${datasourceExpression} | ${visualizationExpression}`;

    return <ExpressionRenderer expression={expression} />;
  }

  return (
    <DragDrop draggable={false} droppable={true} onDrop={onDrop}>
      {renderVisualization()}
    </DragDrop>
  );
}
