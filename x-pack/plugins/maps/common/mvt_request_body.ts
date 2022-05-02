/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RisonValue } from 'rison-node';
import rison from 'rison-node';
import { RENDER_AS } from './constants';

export function decodeMvtResponseBody(encodedRequestBody: string): object {
  return rison.decode(decodeURIComponent(encodedRequestBody)) as object;
}

export function encodeMvtResponseBody(unencodedRequestBody: object): string {
  return encodeURIComponent(rison.encode(unencodedRequestBody as RisonValue));
}

export function getGridTileRequest({
  encodedRequestBody,
  geometryFieldName,
  gridPrecision,
  index,
  renderAs = RENDER_AS.POINT,
  x,
  y,
  z,
}: {
  encodedRequestBody: string;
  geometryFieldName: string;
  gridPrecision: number;
  index: string;
  renderAs: RENDER_AS;
  x: number;
  y: number;
  z: number;
}) {
  const requestBody = decodeMvtResponseBody(encodedRequestBody) as any;
  return {
    path: `/${encodeURIComponent(index)}/_mvt/${geometryFieldName}/${z}/${x}/${y}`,
    body: {
      size: 0, // no hits
      grid_precision: gridPrecision,
      exact_bounds: false,
      extent: 4096, // full resolution,
      query: requestBody.query,
      grid_agg: renderAs === RENDER_AS.HEX ? 'geohex' : 'geotile',
      grid_type: renderAs === RENDER_AS.GRID || renderAs === RENDER_AS.HEX ? 'grid' : 'centroid',
      aggs: requestBody.aggs,
      fields: requestBody.fields,
      runtime_mappings: requestBody.runtime_mappings,
    },
  };
}
