/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint-disable @typescript-eslint/consistent-type-definitions */

import { GeoJsonProperties } from 'geojson';
import { Query } from '../../../../../src/plugins/data/common';
import { DRAW_TYPE, ES_GEO_FIELD_TYPE, ES_SPATIAL_RELATIONS } from '../constants';

export type MapExtent = {
  minLon: number;
  minLat: number;
  maxLon: number;
  maxLat: number;
};

export type MapQuery = Query & {
  queryLastTriggeredAt: string;
};

export type MapRefreshConfig = {
  isPaused: boolean;
  interval: number;
};

export type MapCenter = {
  lat: number;
  lon: number;
};

export type MapCenterAndZoom = MapCenter & {
  zoom: number;
};

export type Goto = {
  bounds?: MapExtent;
  center?: MapCenterAndZoom;
};

export type TooltipFeature = {
  id?: number | string;
  layerId: string;
  mbProperties: GeoJsonProperties;
};

export type TooltipState = {
  features: TooltipFeature[];
  id: string;
  isLocked: boolean;
  location: number[]; // 0 index is lon, 1 index is lat
};

export type DrawState = {
  actionId: string;
  drawType: DRAW_TYPE;
  filterLabel?: string; // point radius filter alias
  geoFieldName?: string;
  geoFieldType?: ES_GEO_FIELD_TYPE;
  geometryLabel?: string;
  indexPatternId?: string;
  relation?: ES_SPATIAL_RELATIONS;
};
