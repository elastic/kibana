/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint-disable @typescript-eslint/consistent-type-definitions */

import {
  DrawState,
  Goto,
  LayerDescriptor,
  MapCenter,
  MapExtent,
  MapQuery,
  MapRefreshConfig,
  TooltipState,
} from '../../common/descriptor_types';
import { INITIAL_LOCATION } from '../../common/constants';
import { Filter, TimeRange } from '../../../../../src/plugins/data/public';

export type MapContext = {
  zoom?: number;
  center?: MapCenter;
  scrollZoom: boolean;
  buffer?: MapExtent;
  extent?: MapExtent;
  mouseCoordinates?: {
    lat: number;
    lon: number;
  };
  timeFilters?: TimeRange;
  query?: MapQuery;
  filters: Filter[];
  refreshConfig?: MapRefreshConfig;
  refreshTimerLastTriggeredAt?: string;
  drawState?: DrawState;
  disableInteractive: boolean;
  disableTooltipControl: boolean;
  hideToolbarOverlay: boolean;
  hideLayerControl: boolean;
  hideViewControl: boolean;
};

export type MapSettings = {
  initialLocation: INITIAL_LOCATION;
  fixedLocation: {
    lat: number;
    lon: number;
    zoom: number;
  };
  browserLocation: {
    zoom: number;
  };
  maxZoom: number;
  minZoom: number;
  showSpatialFilters: boolean;
  spatialFiltersAlpa: number;
  spatialFiltersFillColor: string;
  spatialFiltersLineColor: string;
};

export type MapState = {
  ready: boolean;
  mapInitError?: string | null;
  goto?: Goto | null;
  openTooltips: TooltipState[];
  mapState: MapContext;
  selectedLayerId: string | null;
  layerList: LayerDescriptor[];
  waitingForMapReadyLayerList: LayerDescriptor[];
  settings: MapSettings;
  __rollbackSettings: MapSettings | null;
};
