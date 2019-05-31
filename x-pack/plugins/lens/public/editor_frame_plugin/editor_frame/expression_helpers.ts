/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Ast, fromExpression } from '@kbn/interpreter/common';
import { Visualization, Datasource, DatasourcePublicAPI } from '../../types';

export function buildExpression(
  visualization: Visualization,
  visualizationState: unknown,
  datasource: Datasource,
  datasourceState: unknown,
  datasourcePublicAPI: DatasourcePublicAPI
): Ast | undefined {
  const datasourceExpression = datasource.toExpression(datasourceState);
  const visualizationExpression = visualization.toExpression(
    visualizationState,
    datasourcePublicAPI
  );

  try {
    const parsedDatasourceExpression =
      typeof datasourceExpression === 'string'
        ? fromExpression(datasourceExpression)
        : datasourceExpression;
    const parsedVisualizationExpression =
      typeof visualizationExpression === 'string'
        ? fromExpression(visualizationExpression)
        : visualizationExpression;
    return {
      type: 'expression',
      chain: [...parsedDatasourceExpression.chain, ...parsedVisualizationExpression.chain],
    };
  } catch (_) {
    return undefined;
  }
}
