/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Feature } from 'geojson';
import { GEO_JSON_TYPE, VECTOR_SHAPE_TYPE } from './constants';

export interface VectorShapeTypeCounts {
  [VECTOR_SHAPE_TYPE.POINT]: number;
  [VECTOR_SHAPE_TYPE.LINE]: number;
  [VECTOR_SHAPE_TYPE.POLYGON]: number;
}

export function countVectorShapeTypes(features: Feature[]): VectorShapeTypeCounts {
  const vectorShapeTypeCounts: VectorShapeTypeCounts = {
    [VECTOR_SHAPE_TYPE.POINT]: 0,
    [VECTOR_SHAPE_TYPE.LINE]: 0,
    [VECTOR_SHAPE_TYPE.POLYGON]: 0,
  };

  for (let i = 0; i < features.length; i++) {
    const feature: Feature = features[i];
    if (
      feature.geometry.type === GEO_JSON_TYPE.POINT ||
      feature.geometry.type === GEO_JSON_TYPE.MULTI_POINT
    ) {
      vectorShapeTypeCounts[VECTOR_SHAPE_TYPE.POINT] += 1;
    } else if (
      feature.geometry.type === GEO_JSON_TYPE.LINE_STRING ||
      feature.geometry.type === GEO_JSON_TYPE.MULTI_LINE_STRING
    ) {
      vectorShapeTypeCounts[VECTOR_SHAPE_TYPE.LINE] += 1;
    } else if (
      feature.geometry.type === GEO_JSON_TYPE.POLYGON ||
      feature.geometry.type === GEO_JSON_TYPE.MULTI_POLYGON
    ) {
      vectorShapeTypeCounts[VECTOR_SHAPE_TYPE.POLYGON] += 1;
    }
  }

  return vectorShapeTypeCounts;
}
