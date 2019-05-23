/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';

import { DataSetup } from 'src/legacy/core_plugins/data/public';
import { Action } from './state_management';
import { Datasource, Visualization, DatasourcePublicAPI } from '../../types';
import { DragDrop } from '../../drag_drop';
import { getSuggestions, toSwitchAction } from './suggestion_helpers';

export interface WorkspacePanelProps {
  activeDatasource: Datasource;
  datasourceState: unknown;
  activeVisualizationId: string | null;
  visualizationMap: Record<string, Visualization>;
  visualizationState: unknown;
  datasourcePublicAPI: DatasourcePublicAPI;
  dispatch: (action: Action) => void;
  ExpressionRenderer: DataSetup['expressionExecutor']['ExpressionRenderer'];
}

export function WorkspacePanel({
  activeDatasource,
  activeVisualizationId,
  datasourceState,
  visualizationMap,
  visualizationState,
  datasourcePublicAPI,
  dispatch,
  ExpressionRenderer,
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
      // TODO specify and implement behavior in case of no valid suggestions
      return;
    }

    const suggestion = suggestions[0];

    // TODO heuristically present the suggestions in a modal instead of just picking the first one
    dispatch(toSwitchAction(suggestion));
  }

  function renderEmptyWorkspace() {
    return (
      <p>
        <FormattedMessage
          id="xpack.lens.editorFrame.emptyWorkspace"
          defaultMessage="This is the workspace panel. Drop fields here"
        />
      </p>
    );
  }

  function renderVisualization() {
    if (activeVisualizationId === null) {
      return renderEmptyWorkspace();
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
