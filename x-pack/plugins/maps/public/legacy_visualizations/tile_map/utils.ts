/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Vis } from '@kbn/visualizations-plugin/public';
import { indexPatterns } from '@kbn/data-plugin/public';
import { TileMapVisParams } from './types';
import { title } from './tile_map_vis_type';

export function extractLayerDescriptorParams(vis: Vis<TileMapVisParams>) {
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

  return params;
}
