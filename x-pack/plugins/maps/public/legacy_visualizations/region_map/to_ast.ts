/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { buildExpression } from '../../../../../../src/plugins/expressions/common/ast/build_expression';
import { buildExpressionFunction } from '../../../../../../src/plugins/expressions/common/ast/build_function';
import type { VisToExpressionAst } from '../../../../../../src/plugins/visualizations/public/types';
import type { RegionMapExpressionFunctionDefinition } from './region_map_fn';
import type { RegionMapVisParams } from './types';
import { extractLayerDescriptorParams } from './utils';

export const toExpressionAst: VisToExpressionAst<RegionMapVisParams> = (vis) => {
  const regionMap = buildExpressionFunction<RegionMapExpressionFunctionDefinition>('regionmap', {
    visConfig: JSON.stringify({
      ...vis.params,
      mapCenter: vis.uiState.get('mapCenter', [0, 0]),
      mapZoom: parseInt(vis.uiState.get('mapZoom', 2), 10),
      layerDescriptorParams: extractLayerDescriptorParams(vis),
    }),
  });

  const ast = buildExpression([regionMap]);

  return ast.toAst();
};
