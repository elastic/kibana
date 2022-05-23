/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MVT_GETGRIDTILE_API_PATH,
  MVT_GETTILE_API_PATH,
  RENDER_AS,
} from '../../../../common/constants';
import { getAggsTileRequest, getHitsTileRequest } from '../../../../common/mvt_request_body';
import type { TileRequest } from '../types';

function getSearchParams(url: string): URLSearchParams {
  const split = url.split('?');
  const queryString = split.length <= 1 ? '' : split[1];
  return new URLSearchParams(queryString);
}

export function getTileRequest(tileRequest: TileRequest): { path?: string; body?: object } {
  const searchParams = getSearchParams(tileRequest.tileUrl);
  const encodedRequestBody = searchParams.has('requestBody')
    ? (searchParams.get('requestBody') as string)
    : '()';

  if (!searchParams.has('index')) {
    throw new Error(`Required query parameter 'index' not provided.`);
  }
  const index = searchParams.get('index') as string;

  if (!searchParams.has('geometryFieldName')) {
    throw new Error(`Required query parameter 'geometryFieldName' not provided.`);
  }
  const geometryFieldName = searchParams.get('geometryFieldName') as string;

  const hasLabels = searchParams.has('hasLabels')
    ? searchParams.get('hasLabels') === 'true'
    : false;

  if (tileRequest.tileUrl.includes(MVT_GETGRIDTILE_API_PATH)) {
    return getAggsTileRequest({
      encodedRequestBody,
      geometryFieldName,
      gridPrecision: parseInt(searchParams.get('gridPrecision') as string, 10),
      hasLabels,
      index,
      renderAs: searchParams.get('renderAs') as RENDER_AS,
      x: tileRequest.x,
      y: tileRequest.y,
      z: tileRequest.z,
    });
  }

  if (tileRequest.tileUrl.includes(MVT_GETTILE_API_PATH)) {
    return getHitsTileRequest({
      encodedRequestBody,
      geometryFieldName,
      hasLabels,
      index,
      x: tileRequest.x,
      y: tileRequest.y,
      z: tileRequest.z,
    });
  }

  throw new Error('Unexpected path');
}
