/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { buildExpression, buildExpressionFunction } from '../../../../../../src/plugins/expressions/public';
import { VisToExpressionAst } from '../../../../../../src/plugins/visualizations/public';
import { TileMapExpressionFunctionDefinition } from './tile_map_fn';
import { TileMapVisParams } from './types';

export const toExpressionAst: VisToExpressionAst<TileMapVisParams> = (vis) => {
  const params: { [key: string]: any } = {
    label: vis.title ? vis.title : title,
    mapType: vis.params.mapType,
    colorSchema: vis.params.colorSchema,
    indexPatternId: vis.data.indexPattern?.id,
    metricAgg: 'count',
  };

  const bucketAggs = vis.data?.aggs?.byType('buckets');
  if (bucketAggs?.length && bucketAggs[0].type.dslName === 'geohash_grid') {
    params.geoFieldName = bucketAggs[0].getField()?.name;
  } else if (vis.data.indexPattern) {
    // attempt to default to first geo point field when geohash is not configured yet
    const geoField = vis.data.indexPattern.fields.find((field) => {
      return (
        !indexPatterns.isNestedField(field) && field.aggregatable && field.type === 'geo_point'
      );
    });
    if (geoField) {
      params.geoFieldName = geoField.name;
    }
  }

  const metricAggs = vis.data?.aggs?.byType('metrics');
  if (metricAggs?.length) {
    params.metricAgg = metricAggs[0].type.dslName;
    params.metricFieldName = metricAggs[0].getField()?.name;
  }

  const tileMap = buildExpressionFunction<TileMapExpressionFunctionDefinition>(
    'tilemap',
    {
      visConfig: JSON.stringify({
        ...vis.params,
        layerDescriptorParams: params,
      }),
    }
  );

  const ast = buildExpression([tileMap]);

  return ast.toAst();
};