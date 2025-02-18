/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { MapsStartApi } from '@kbn/maps-plugin/public';
import type { LayerDescriptor } from '@kbn/maps-plugin/common';
import { getHttpRequestsLayerList } from './get_http_requests_map_layer_list';
import { getSessionMapLayerList } from './get_session_map_layer_list';
import type { StyleColorParams } from './style_color_params';
import { MapTypes } from '../../../../../../../common/mobile/constants';

export function getLayerList({
  selectedMap,
  maps,
  dataViewId,
  styleColors,
}: {
  selectedMap: MapTypes;
  maps: MapsStartApi | undefined;
  dataViewId: string;
  styleColors: StyleColorParams;
}): LayerDescriptor[] {
  switch (selectedMap) {
    case MapTypes.Http:
      return getHttpRequestsLayerList(maps, dataViewId, styleColors);
    case MapTypes.Session:
      return getSessionMapLayerList(maps, dataViewId, styleColors);
    default:
      return getHttpRequestsLayerList(maps, dataViewId, styleColors);
  }
}
