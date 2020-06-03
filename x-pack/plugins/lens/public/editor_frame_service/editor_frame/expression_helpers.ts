/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Ast, fromExpression, ExpressionFunctionAST } from '@kbn/interpreter/common';
import { Visualization, Datasource, FramePublicAPI } from '../../types';
import { Filter, TimeRange, Query } from '../../../../../../src/plugins/data/public';
import { EditorFrameState } from './state_management';

export function prependDatasourceExpression(
  visualizationExpression: Ast | string | null,
  datasourceMap: Record<string, Datasource>,
  datasourceStates: Record<
    string,
    {
      isLoading: boolean;
      state: unknown;
    }
  >,
  frameState: EditorFrameState
): Ast | null {
  const datasourceExpressions: Array<[string, Ast]> = [];

  const { prejoin, join, postjoin, timeRangeOverrides } = frameState.pipeline;

  Object.entries(datasourceMap).forEach(([datasourceId, datasource]) => {
    const state = datasourceStates[datasourceId].state;
    const layers = datasource.getLayers(datasourceStates[datasourceId].state);

    layers.forEach((layerId) => {
      const result = datasource.toExpression(state, layerId);
      const resultAst = typeof result === 'string' ? fromExpression(result) : result;

      const hasTimeShift = timeRangeOverrides[layerId];

      const prejoinChain: ExpressionFunctionAST[] = [];

      if (prejoin[layerId]) {
        prejoin[layerId].forEach((j) => {
          prejoinChain.push(j.expression);
        });
      }

      if (resultAst) {
        if (hasTimeShift) {
          datasourceExpressions.push([
            layerId,
            {
              type: 'expression',
              chain: [
                {
                  type: 'function',
                  function: 'lens_shift_time',
                  arguments: {
                    type: [hasTimeShift],
                  },
                },
                ...resultAst.chain,
                ...prejoinChain,
              ],
            },
          ]);
        } else {
          datasourceExpressions.push([
            layerId,
            {
              type: 'expression',
              chain: [...resultAst.chain, ...prejoinChain],
            },
          ]);
        }
      }
    });
  });

  if (datasourceExpressions.length === 0 || visualizationExpression === null) {
    return null;
  }
  const datafetchExpression: ExpressionFunctionAST = {
    type: 'function',
    function: 'lens_merge_tables',
    arguments: {
      layerIds: datasourceExpressions.map(([id]) => id),
      tables: datasourceExpressions.map(([id, expr]) => expr),
    },
  };

  const parsedVisualizationExpression =
    typeof visualizationExpression === 'string'
      ? fromExpression(visualizationExpression)
      : visualizationExpression;

  const postjoinChain: ExpressionFunctionAST[] = [];
  if (postjoin.length) {
    postjoin.forEach((j) => {
      postjoinChain.push(j.expression);
    });
  }

  if (join) {
    return {
      type: 'expression',
      chain: [
        datafetchExpression,
        {
          type: 'function',
          function: 'lens_join',
          arguments: {
            joinType: [join.joinType],
            leftLayerId: [join.leftLayerId],
            rightLayerId: [join.rightLayerId],
            leftColumnId: join.leftColumnId ? [join.leftColumnId] : [],
            rightColumnId: join.rightColumnId ? [join.rightColumnId] : [],
          },
        },
        ...postjoinChain,
        ...parsedVisualizationExpression.chain,
      ],
    };
  }

  return {
    type: 'expression',
    chain: [datafetchExpression, ...postjoinChain, ...parsedVisualizationExpression.chain],
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
  state,
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
  state: EditorFrameState;
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
    datasourceStates,
    state
  );

  if (completeExpression) {
    return prependKibanaContext(completeExpression, expressionContext);
  } else {
    return null;
  }
}
