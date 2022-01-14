/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/consistent-type-definitions */

import { ReactNode } from 'react';
import { GeoJsonProperties } from 'geojson';
import { Geometry } from 'geojson';
import { DRAW_SHAPE, ES_SPATIAL_RELATIONS } from '../constants';

export type MapExtent = {
  minLon: number;
  minLat: number;
  maxLon: number;
  maxLat: number;
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

export const GEOMETRY_FILTER_ACTION = 'GEOMETRY_FILTER_ACTION';

export type TooltipFeatureAction = {
  label: string;
  id: typeof GEOMETRY_FILTER_ACTION;
  form: ReactNode;
};

export type TooltipFeature = {
  /*
   * Feature id. Assigned by layer
   */
  id?: number | string;

  /*
   * Id of layer that manages feature on the map
   */
  layerId: string;

  geometry?: Geometry;

  /*
   * Feature properties. Retrieved from the map implemenation
   */
  mbProperties: GeoJsonProperties;

  actions: TooltipFeatureAction[];
};

export type TooltipState = {
  features: TooltipFeature[];
  id: string;
  isLocked: boolean;
  location: [number, number]; // 0 index is lon, 1 index is lat
};

export type DrawState = {
  actionId: string;
  drawShape?: DRAW_SHAPE;
  filterLabel?: string; // point radius filter alias
  geometryLabel?: string;
  relation?: ES_SPATIAL_RELATIONS;
};

export type EditState = {
  layerId: string;
  drawShape?: DRAW_SHAPE;
};
