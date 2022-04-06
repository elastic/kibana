/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Ast, AstFunction, fromExpression } from '@kbn/interpreter';
import { ExpressionAstExpression } from 'src/plugins/expressions/public';
import { DatasourceStates } from '../../state_management';
import { Visualization, DatasourcePublicAPI, DatasourceMap } from '../../types';

export function prependDatasourceExpression(
  visualizationExpression: Ast | string | null,
  datasourceMap: DatasourceMap,
  datasourceStates: DatasourceStates,
  visualizationState: unknown,
  visualization: Visualization<unknown>
): Ast | null {
  const datasourceExpressions: Array<[string, Ast | string]> = [];

  Object.entries(datasourceMap).forEach(([datasourceId, datasource]) => {
    const state = datasourceStates[datasourceId].state;
    const layers = datasource.getLayers(datasourceStates[datasourceId].state);

    layers.forEach((layerId) => {
      const groups = visualization.getConfiguration({
        layerId,
        state: visualizationState,
        frame: {
          datasourceLayers: {
            [layerId]: datasource.getPublicAPI({
              state,
              layerId,
            }),
          },
        },
      }).groups;
      const result = datasource.toExpression(state, layerId) as ExpressionAstExpression | null;
      const layerAPI = datasource.getPublicAPI({
        state,
        layerId,
      });
      const columns = layerAPI.getTableSpec();
      const collapseColumns = columns
        .filter((c) => !groups.some((g) => g.accessors.some((a) => a.columnId === c.columnId)))
        .map((c) => c.columnId);
      if (collapseColumns.length > 0 && result) {
        result.chain = [
          ...result.chain,
          {
            type: 'function',
            function: 'lens_collapse',
            arguments: {
              by: columns
                .filter(
                  (c) =>
                    !collapseColumns.includes(c.columnId) &&
                    layerAPI.getOperationForColumnId(c.columnId)?.isBucketed
                )
                .map((c) => c.columnId),
              metric: columns
                .filter(
                  (c) =>
                    !collapseColumns.includes(c.columnId) &&
                    !layerAPI.getOperationForColumnId(c.columnId)?.isBucketed
                )
                .map((c) => c.columnId),
              fn: ['sum'],
            },
          },
        ];
      }
      if (result) {
        datasourceExpressions.push([layerId, result]);
      }
    });
  });

  if (datasourceExpressions.length === 0 || visualizationExpression === null) {
    return null;
  }
  const parsedDatasourceExpressions: Array<[string, Ast]> = datasourceExpressions.map(
    ([layerId, expr]) => [layerId, typeof expr === 'string' ? fromExpression(expr) : expr]
  );

  const datafetchExpression: AstFunction = {
    type: 'function',
    function: 'lens_merge_tables',
    arguments: {
      layerIds: parsedDatasourceExpressions.map(([id]) => id),
      tables: parsedDatasourceExpressions.map(([id, expr]) => expr),
    },
  };

  const parsedVisualizationExpression =
    typeof visualizationExpression === 'string'
      ? fromExpression(visualizationExpression)
      : visualizationExpression;

  return {
    type: 'expression',
    chain: [
      { type: 'function', function: 'kibana', arguments: {} },
      datafetchExpression,
      ...parsedVisualizationExpression.chain,
    ],
  };
}

export function buildExpression({
  visualization,
  visualizationState,
  datasourceMap,
  datasourceStates,
  datasourceLayers,
  title,
  description,
}: {
  title?: string;
  description?: string;
  visualization: Visualization | null;
  visualizationState: unknown;
  datasourceMap: DatasourceMap;
  datasourceStates: DatasourceStates;
  datasourceLayers: Record<string, DatasourcePublicAPI>;
}): Ast | null {
  if (visualization === null) {
    return null;
  }
  const visualizationExpression = visualization.toExpression(visualizationState, datasourceLayers, {
    title,
    description,
  });

  const completeExpression = prependDatasourceExpression(
    visualizationExpression,
    datasourceMap,
    datasourceStates,
    visualizationState,
    visualization
  );

  return completeExpression;
}
