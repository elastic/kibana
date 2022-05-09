/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Query } from '@kbn/data-plugin/public';
import { LayerDescriptor } from '../../../../common/descriptor_types';
import { ES_GEO_FIELD_TYPE, SCALING_TYPES } from '../../../../common/constants';
import { ESSearchSource } from './es_search_source';
import { GeoJsonVectorLayer } from '../../layers/vector_layer';
import { getIsGoldPlus } from '../../../licensed_features';

export interface CreateLayerDescriptorParams {
  indexPatternId: string;
  geoFieldName: string;
  geoFieldType: ES_GEO_FIELD_TYPE;
  query?: Query;
}

export function createLayerDescriptor({
  indexPatternId,
  geoFieldName,
  geoFieldType,
  query,
}: CreateLayerDescriptorParams): LayerDescriptor {
  // Prefer clusters for geo_shapes if liscensing is enabled.
  const scalingType =
    geoFieldType === ES_GEO_FIELD_TYPE.GEO_POINT ||
    (geoFieldType === ES_GEO_FIELD_TYPE.GEO_SHAPE && getIsGoldPlus())
      ? SCALING_TYPES.CLUSTERS
      : SCALING_TYPES.LIMIT;
  const sourceDescriptor = ESSearchSource.createDescriptor({
    indexPatternId,
    geoField: geoFieldName,
    scalingType,
  });

  return GeoJsonVectorLayer.createDescriptor({ sourceDescriptor, query });
}
