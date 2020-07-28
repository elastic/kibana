/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Ast, fromExpression, ExpressionFunctionAST } from '@kbn/interpreter/common';
import { Visualization, Datasource, FramePublicAPI } from '../../types';
import { Filter, TimeRange, Query } from '../../../../../../src/plugins/data/public';

export function prependDatasourceExpression(
  visualizationExpression: Ast | string | null,
  datasourceMap: Record<string, Datasource>,
  datasourceStates: Record<
    string,
    {
      isLoading: boolean;
      state: unknown;
    }
  >
): Ast | null {
  const datasourceExpressions: Array<[string, Ast | string]> = [];

  Object.entries(datasourceMap).forEach(([datasourceId, datasource]) => {
    const state = datasourceStates[datasourceId].state;
    const layers = datasource.getLayers(datasourceStates[datasourceId].state);

    layers.forEach((layerId) => {
      const result = datasource.toExpression(state, layerId);
      if (result) {
        datasourceExpressions.push([layerId, result]);
      }
    });
  });

  if (datasourceExpressions.length === 0 || visualizationExpression === null) {
    return null;
  }
  const parsedDatasourceExpressions: Array<[
    string,
    Ast
  ]> = datasourceExpressions.map(([layerId, expr]) => [
    layerId,
    typeof expr === 'string' ? fromExpression(expr) : expr,
  ]);

  const datafetchExpression: ExpressionFunctionAST = {
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
    chain: [datafetchExpression, ...parsedVisualizationExpression.chain],
  };
}

export function prependKibanaContext(
  expression: Ast | string,
  {
    timeRange,
    query,
    filters,
  }: {
    timeRange?: TimeRange;
    query?: Query;
    filters?: Filter[];
  }
): Ast {
  const parsedExpression = typeof expression === 'string' ? fromExpression(expression) : expression;

  return {
    type: 'expression',
    chain: [
      { type: 'function', function: 'kibana', arguments: {} },
      {
        type: 'function',
        function: 'kibana_context',
        arguments: {
          timeRange: timeRange ? [JSON.stringify(timeRange)] : [],
          query: query ? [JSON.stringify(query)] : [],
          filters: [JSON.stringify(filters || [])],
        },
      },
      ...parsedExpression.chain,
    ],
  };
}

export function buildExpression({
  visualization,
  visualizationState,
  datasourceMap,
  datasourceStates,
  framePublicAPI,
  removeDateRange,
}: {
  visualization: Visualization | null;
  visualizationState: unknown;
  datasourceMap: Record<string, Datasource>;
  datasourceStates: Record<
    string,
    {
      isLoading: boolean;
      state: unknown;
    }
  >;
  framePublicAPI: FramePublicAPI;
  removeDateRange?: boolean;
}): Ast | null {
  if (visualization === null) {
    return null;
  }
  const visualizationExpression = visualization.toExpression(visualizationState, framePublicAPI);

  const expressionContext = removeDateRange
    ? { query: framePublicAPI.query, filters: framePublicAPI.filters }
    : {
        query: framePublicAPI.query,
        timeRange: {
          from: framePublicAPI.dateRange.fromDate,
          to: framePublicAPI.dateRange.toDate,
        },
        filters: framePublicAPI.filters,
      };

  const completeExpression = prependDatasourceExpression(
    visualizationExpression,
    datasourceMap,
    datasourceStates
  );

  if (completeExpression) {
    return prependKibanaContext(completeExpression, expressionContext);
  } else {
    return null;
  }
}
