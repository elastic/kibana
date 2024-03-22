/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ELASTIC_HTTP_VERSION_HEADER,
  X_ELASTIC_INTERNAL_ORIGIN_REQUEST,
} from '@kbn/core-http-common';
import {
  FONTS_API_PATH,
  MVT_GETTILE_API_PATH,
  MVT_GETGRIDTILE_API_PATH,
} from '../../../common/constants';
import { getHttp } from '../../kibana_services';

const FONTS = getHttp().basePath.prepend(FONTS_API_PATH);
const GETTILE = getHttp().basePath.prepend(MVT_GETTILE_API_PATH);
const GETGRIDTILE = getHttp().basePath.prepend(MVT_GETGRIDTILE_API_PATH);

/**
 * This URL could be used from inside a Worker which may have a different base
 * URL. This function takes a string that may be a path and converts it to an
 * absolute URL.
 */
function prepareAbsoluteUrl(pathOrUrl: string): string {
  if (pathOrUrl.startsWith('/')) {
    return new URL(pathOrUrl, window.location.origin).toString();
  }
  return pathOrUrl;
}

export function transformRequest(path: string, resourceType: string | undefined) {
  const url = prepareAbsoluteUrl(path);
  if (resourceType === 'Glyphs' && path.startsWith(FONTS)) {
    return {
      url,
      method: 'GET' as 'GET',
      headers: {
        [ELASTIC_HTTP_VERSION_HEADER]: '1',
        [X_ELASTIC_INTERNAL_ORIGIN_REQUEST]: 'kibana',
      },
    };
  }

  if (resourceType === 'Tile' && path.startsWith(GETTILE)) {
    return {
      url,
      method: 'GET' as 'GET',
      headers: {
        [ELASTIC_HTTP_VERSION_HEADER]: '1',
        [X_ELASTIC_INTERNAL_ORIGIN_REQUEST]: 'kibana',
      },
    };
  }

  if (resourceType === 'Tile' && path.startsWith(GETGRIDTILE)) {
    return {
      url,
      method: 'GET' as 'GET',
      headers: {
        [ELASTIC_HTTP_VERSION_HEADER]: '1',
        [X_ELASTIC_INTERNAL_ORIGIN_REQUEST]: 'kibana',
      },
    };
  }

  return { url };
}
