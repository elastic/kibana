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

export function transformRequest(url: string, resourceType: string | undefined) {
  if (resourceType === 'Glyphs' && url.startsWith(FONTS)) {
    return {
      url,
      method: 'GET' as 'GET',
      headers: {
        [ELASTIC_HTTP_VERSION_HEADER]: '1',
        [X_ELASTIC_INTERNAL_ORIGIN_REQUEST]: 'kibana',
      },
    };
  }

  if (resourceType === 'Tile' && url.startsWith(GETTILE)) {
    return {
      url,
      method: 'GET' as 'GET',
      headers: {
        [ELASTIC_HTTP_VERSION_HEADER]: '1',
        [X_ELASTIC_INTERNAL_ORIGIN_REQUEST]: 'kibana',
      },
    };
  }

  if (resourceType === 'Tile' && url.startsWith(GETGRIDTILE)) {
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
