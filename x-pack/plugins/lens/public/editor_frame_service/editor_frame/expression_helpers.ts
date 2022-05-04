/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Ast, AstFunction, fromExpression } from '@kbn/interpreter';
import { DatasourceStates } from '../../state_management';
import { Visualization, DatasourceMap, DatasourceLayers } from '../../types';

export function getDatasourceExpressionsByLayers(
  datasourceMap: DatasourceMap,
  datasourceStates: DatasourceStates
): null | Record<string, Ast> {
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

  if (datasourceExpressions.length === 0) {
    return null;
  }

  return datasourceExpressions.reduce(
    (exprs, [layerId, expr]) => ({
      ...exprs,
      [layerId]: typeof expr === 'string' ? fromExpression(expr) : expr,
    }),
    {}
  );
}

export function prependDatasourceExpression(
  visualizationExpression: Ast | string | null,
  datasourceMap: DatasourceMap,
  datasourceStates: DatasourceStates
): Ast | null {
  const datasourceExpressionsByLayers = getDatasourceExpressionsByLayers(
    datasourceMap,
    datasourceStates
  );

  if (datasourceExpressionsByLayers === null || visualizationExpression === null) {
    return null;
  }

  const parsedDatasourceExpressions = Object.entries(datasourceExpressionsByLayers);

  const datafetchExpression: AstFunction = {
    type: 'function',
    function: 'lens_merge_tables',
    arguments: {
      layerIds: parsedDatasourceExpressions.map(([id]) => id),
      tables: parsedDatasourceExpressions.map(([, expr]) => expr),
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
  datasourceLayers: DatasourceLayers;
}): Ast | null {
  if (visualization === null) {
    return null;
  }

  if (visualization.shouldBuildDatasourceExpressionManually?.()) {
    const datasourceExpressionsByLayers = getDatasourceExpressionsByLayers(
      datasourceMap,
      datasourceStates
    );

    const visualizationExpression = visualization.toExpression(
      visualizationState,
      datasourceLayers,
      {
        title,
        description,
      },
      datasourceExpressionsByLayers ?? undefined
    );

    return typeof visualizationExpression === 'string'
      ? fromExpression(visualizationExpression)
      : visualizationExpression;
  }

  const visualizationExpression = visualization.toExpression(visualizationState, datasourceLayers, {
    title,
    description,
  });

  return prependDatasourceExpression(visualizationExpression, datasourceMap, datasourceStates);
}
