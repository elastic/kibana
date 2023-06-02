/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import rison from '@kbn/rison';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { RENDER_AS } from './constants';

export function getAggsTileRequest({
  buffer,
  risonRequestBody,
  geometryFieldName,
  gridPrecision,
  hasLabels,
  index,
  renderAs = RENDER_AS.POINT,
  x,
  y,
  z,
}: {
  buffer: number;
  risonRequestBody: string;
  geometryFieldName: string;
  gridPrecision: number;
  hasLabels: boolean;
  index: string;
  renderAs: RENDER_AS;
  x: number;
  y: number;
  z: number;
}) {
  const requestBody = rison.decode(risonRequestBody) as estypes.SearchRequest['body'];
  if (!requestBody) {
    throw new Error('Required requestBody parameter not provided');
  }
  return {
    path: `/${encodeURIComponent(index)}/_mvt/${encodeURIComponent(
      geometryFieldName
    )}/${z}/${x}/${y}`,
    body: {
      buffer,
      size: 0, // no hits
      grid_precision: gridPrecision,
      exact_bounds: false,
      extent: 4096, // full resolution,
      query: requestBody.query,
      grid_agg: renderAs === RENDER_AS.HEX ? 'geohex' : 'geotile',
      grid_type: renderAs === RENDER_AS.GRID || renderAs === RENDER_AS.HEX ? 'grid' : 'centroid',
      aggs: requestBody.aggs,
      fields: requestBody.fields ? requestBody.fields : [],
      runtime_mappings: requestBody.runtime_mappings,
      with_labels: hasLabels,
    } as estypes.SearchMvtRequest['body'],
  };
}

export function getHitsTileRequest({
  buffer,
  risonRequestBody,
  geometryFieldName,
  hasLabels,
  index,
  x,
  y,
  z,
}: {
  buffer: number;
  risonRequestBody: string;
  geometryFieldName: string;
  hasLabels: boolean;
  index: string;
  x: number;
  y: number;
  z: number;
}) {
  const requestBody = rison.decode(risonRequestBody) as estypes.SearchRequest['body'];
  if (!requestBody) {
    throw new Error('Required requestBody parameter not provided');
  }
  const tileRequestBody = {
    buffer,
    grid_precision: 0, // no aggs
    exact_bounds: true,
    extent: 4096, // full resolution,
    query: requestBody.query,
    runtime_mappings: requestBody.runtime_mappings,
    track_total_hits: typeof requestBody.size === 'number' ? requestBody.size + 1 : false,
    with_labels: hasLabels,
  } as estypes.SearchMvtRequest['body'];
  if (requestBody.fields) {
    // @ts-expect-error SearchRequest['body'].fields and SearchMvtRequest['body'].fields types do not allign, even though they do in implemenation
    tileRequestBody.fields = requestBody.fields;
  }
  if (requestBody.sort) {
    tileRequestBody!.sort = requestBody.sort;
  }
  return {
    path: `/${encodeURIComponent(index)}/_mvt/${encodeURIComponent(
      geometryFieldName
    )}/${z}/${x}/${y}`,
    body: tileRequestBody,
  };
}
