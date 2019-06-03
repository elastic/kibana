/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';

import { ExpressionRenderer } from '../../../../../../src/legacy/core_plugins/data/public';
import { Action } from './state_management';
import { Datasource, Visualization, DatasourcePublicAPI } from '../../types';
import { DragDrop } from '../../drag_drop';
import { getSuggestions, toSwitchAction } from './suggestion_helpers';
import { buildExpression } from './expression_helpers';

export interface WorkspacePanelProps {
  activeDatasource: Datasource;
  datasourceState: unknown;
  activeVisualizationId: string | null;
  visualizationMap: Record<string, Visualization>;
  visualizationState: unknown;
  datasourcePublicAPI: DatasourcePublicAPI;
  dispatch: (action: Action) => void;
  ExpressionRenderer: ExpressionRenderer;
}

export function WorkspacePanel({
  activeDatasource,
  activeVisualizationId,
  datasourceState,
  visualizationMap,
  visualizationState,
  datasourcePublicAPI,
  dispatch,
  ExpressionRenderer: ExpressionRendererComponent,
}: WorkspacePanelProps) {
  function onDrop() {
    const datasourceSuggestions = activeDatasource.getDatasourceSuggestionsForField(
      datasourceState
    );

    const suggestions = getSuggestions(
      datasourceSuggestions,
      visualizationMap,
      activeVisualizationId,
      visualizationState
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
      <p data-test-subj="empty-workspace">
        <FormattedMessage
          id="xpack.lens.editorFrame.emptyWorkspace"
          defaultMessage="This is the workspace panel. Drop fields here"
        />
      </p>
    );
  }

  function renderVisualization() {
    const [expressionError, setExpressionError] = useState(false);

    const activeVisualization = activeVisualizationId && visualizationMap[activeVisualizationId];
    const expression = useMemo(
      () =>
        activeVisualization &&
        buildExpression(
          activeVisualization,
          visualizationState,
          activeDatasource,
          datasourceState,
          datasourcePublicAPI
        ),
      [
        activeVisualization,
        visualizationState,
        activeDatasource,
        datasourceState,
        datasourcePublicAPI,
      ]
    );

    useEffect(
      () => {
        // reset expression error if component attempts to run it again
        if (expressionError) {
          setExpressionError(false);
        }
      },
      [expressionError, expression]
    );

    if (activeVisualizationId === null) {
      return renderEmptyWorkspace();
    }

    if (expression && !expressionError) {
      return (
        <ExpressionRendererComponent
          expression={expression}
          onRenderFailure={() => {
            setExpressionError(true);
          }}
        />
      );
    } else {
      return (
        <p data-test-subj="expression-failure">
          {/* TODO word this differently because expressions should not be exposed at this level */}
          <FormattedMessage
            id="xpack.lens.editorFrame.expressionFailure"
            defaultMessage="Expression could not be executed successfully"
          />
        </p>
      );
    }
  }

  return (
    <DragDrop draggable={false} droppable={true} onDrop={onDrop}>
      {renderVisualization()}
    </DragDrop>
  );
}
