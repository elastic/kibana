/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Feature, Point } from 'geojson';
import { ES_FIELD_TYPES } from '@kbn/data-plugin/public';
import type { ImportDoc } from '../../../common/types';

export function createChunks(
  features: Feature[],
  geoFieldType: ES_FIELD_TYPES.GEO_POINT | ES_FIELD_TYPES.GEO_SHAPE,
  maxChunkCharCount: number
): ImportDoc[][] {
  const chunks: ImportDoc[][] = [];

  let chunk: ImportDoc[] = [];
  let chunkChars = 0;
  for (let i = 0; i < features.length; i++) {
    const doc = toEsDoc(features[i], geoFieldType);
    const docChars = JSON.stringify(doc).length + 1; // +1 adds CHAR for comma once document is in list
    if (chunk.length === 0 || chunkChars + docChars < maxChunkCharCount) {
      // add ES document to current chunk
      chunk.push(doc);
      chunkChars += docChars;
    } else {
      // chunk boundary found, start new chunk
      chunks.push(chunk);
      chunk = [doc];
      chunkChars = docChars;
    }
  }

  if (chunk.length) {
    chunks.push(chunk);
  }

  return chunks;
}

export function toEsDoc(
  feature: Feature,
  geoFieldType: ES_FIELD_TYPES.GEO_POINT | ES_FIELD_TYPES.GEO_SHAPE
) {
  const properties = feature.properties ? feature.properties : {};
  return {
    geometry:
      geoFieldType === ES_FIELD_TYPES.GEO_SHAPE
        ? feature.geometry
        : (feature.geometry as Point).coordinates,
    ...properties,
  };
}
