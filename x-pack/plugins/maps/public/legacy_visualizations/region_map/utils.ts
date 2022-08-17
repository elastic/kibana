/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Vis } from '@kbn/visualizations-plugin/public';
import { RegionMapVisParams } from './types';
import { title } from './region_map_vis_type';

function getEmsLayerId(id: string | number, layerId: string) {
  if (typeof id === 'string') {
    return id;
  }

  // Region maps from 6.x will have numerical EMS id refering to S3 bucket id.
  // In this case, use layerId with contains the EMS layer name.
  const split = layerId.split('.');
  return split.length === 2 ? split[1] : undefined;
}

export function extractLayerDescriptorParams(vis: Vis<RegionMapVisParams>) {
  const params: { [key: string]: any } = {
    label: vis.title ? vis.title : title,
    emsLayerId: vis.params.selectedLayer.isEMS
      ? getEmsLayerId(vis.params.selectedLayer.id, vis.params.selectedLayer.layerId)
      : undefined,
    leftFieldName: vis.params.selectedLayer.isEMS ? vis.params.selectedJoinField.name : undefined,
    colorSchema: vis.params.colorSchema,
    indexPatternId: vis.data.indexPattern?.id,
    indexPatternTitle: vis.data.indexPattern?.title,
    metricAgg: 'count',
  };

  const bucketAggs = vis.data?.aggs?.byType('buckets');
  if (bucketAggs?.length && bucketAggs[0].type.dslName === 'terms') {
    params.termsFieldName = bucketAggs[0].getField()?.name;
    params.termsSize = bucketAggs[0].getParam('size');
  }

  const metricAggs = vis.data?.aggs?.byType('metrics');
  if (metricAggs?.length) {
    params.metricAgg = metricAggs[0].type.dslName;
    params.metricFieldName = metricAggs[0].getField()?.name;
  }

  return params;
}
