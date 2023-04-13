/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { MapsStartApi } from '@kbn/maps-plugin/public';
import { LayerDescriptor } from '@kbn/maps-plugin/common';
import { getHttpRequestsLayerList } from './get_http_requests_map_layer_list';
import { getSessionMapLayerList } from './get_session_map_layer_list';
import { MapTypes } from '../../../../../../../common/mobile/constants';

export async function getLayerList({
  selectedMap,
  maps,
}: {
  selectedMap: MapTypes;
  maps?: MapsStartApi;
}): Promise<LayerDescriptor[]> {
  switch (selectedMap) {
    case MapTypes.Http:
      return await getHttpRequestsLayerList(maps);
    case MapTypes.Session:
      return await getSessionMapLayerList(maps);
    default:
      return await getHttpRequestsLayerList(maps);
  }
}
