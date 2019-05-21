/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Action } from './state_management';
import {
  Datasource,
  Visualization,
  DatasourcePublicAPI,
  DatasourceSuggestion,
  DimensionRole,
  TableColumn,
} from '../../types';

interface SuggestionPanelProps {
  activeDatasource: Datasource;
  datasourceState: unknown;
  activeVisualizationId: string | null;
  visualizations: Record<string, Visualization>;
  visualizationState: unknown;
  datasourcePublicAPI: DatasourcePublicAPI;
  dispatch: (action: Action) => void;
}

export function SuggestionPanel(props: SuggestionPanelProps) {
  const currentDatasource = props.activeDatasource;
  const datasourceSuggestions = currentDatasource.getDatasourceSuggestionsFromCurrentState(
    props.datasourceState
  );
  const roleMapping = props.activeVisualizationId
    ? props.visualizations[props.activeVisualizationId].getMappingOfTableToRoles(
        props.visualizationState,
        props.datasourcePublicAPI
      )
    : [];
  const suggestions = getSuggestions(datasourceSuggestions, props.visualizations, roleMapping);
  return (
    <>
      {/* TODO: I18N */}
      <h2>Suggestions</h2>
      {suggestions.map((suggestion, index) => {
        return (
          <button
            key={index}
            data-test-subj="suggestion"
            onClick={() => {
              props.dispatch({
                type: 'SWITCH_VISUALIZATION',
                newVisualizationId: suggestion.visualizationId,
                initialState: suggestion.state,
                datasourceState: suggestion.datasourceState,
              });
            }}
          >
            {suggestion.title}
          </button>
        );
      })}
    </>
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
