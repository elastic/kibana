/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DatasourcePublicAPI, TableColumn, Visualization, DatasourceSuggestion } from '../../types';

export function getSuggestions(
  datasourceTableSuggestions: DatasourceSuggestion[],
  visualizationMap: Record<string, Visualization>,
  activeVisualizationId: string | null,
  activeVisualizationState: unknown,
  datasourcePublicAPI: DatasourcePublicAPI
) {
  const roleMapping = activeVisualizationId
    ? visualizationMap[activeVisualizationId].getMappingOfTableToRoles(
        activeVisualizationState,
        datasourcePublicAPI
      )
    : [];
  const datasourceTableMetas: Record<string, TableColumn[]> = {};
  datasourceTableSuggestions.map(({ tableColumns }, datasourceSuggestionId) => {
    datasourceTableMetas[datasourceSuggestionId] = tableColumns;
  });

  return (
    Object.entries(visualizationMap)
      .map(([visualizationId, visualization]) => {
        return visualization
          .getSuggestions({
            tableColumns: datasourceTableMetas,
            roles: roleMapping,
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
