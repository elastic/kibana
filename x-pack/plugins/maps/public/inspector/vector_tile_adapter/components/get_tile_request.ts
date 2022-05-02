/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MVT_GETGRIDTILE_API_PATH, RENDER_AS } from '../../../../common/constants';
import { getGridTileRequest } from '../../../../common/mvt_request_body';
import type { TileRequest } from '../types';

function getSearchParams(url: string): URLSearchParams {
  const split = url.split('?');
  const queryString = split.length <= 1 ? '' : split[1];
  return new URLSearchParams(queryString);
}

function getZXY(zxyString: string) {
  const split = zxyString.split('/');
  if (split.length != 3) {
    throw new Error('Unable to extract {z}/{x}/{y} coordinates from tile request');
  }

  return { z: parseInt(split[0], 10), x: parseInt(split[1], 10), y: parseInt(split[2], 10) };
}

export function getTileRequest(tileRequest: TileRequest): { path?: string; body?: object } {
  const { z, x, y } = getZXY(tileRequest.tileZXYKey);
  const searchParams = getSearchParams(tileRequest.tileUrl);
  const encodedRequestBody = searchParams.has('requestBody')
    ? searchParams.get('requestBody') as string
    : '()';

  if (tileRequest.tileUrl.includes(MVT_GETGRIDTILE_API_PATH)) {
    return getGridTileRequest({
      encodedRequestBody,
      geometryFieldName: searchParams.get('geometryFieldName') as string,
      gridPrecision: parseInt(searchParams.get('gridPrecision') as string, 10),
      index: searchParams.get('index') as string,
      renderAs: searchParams.get('renderAs') as RENDER_AS,
      x,
      y,
      z,
    });
  }

  return {};
}
