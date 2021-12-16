/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/consistent-type-definitions */

import type { Query } from 'src/plugins/data/common';
import { Filter } from '@kbn/es-query';
import {
  DrawState,
  EditState,
  Goto,
  LayerDescriptor,
  MapCenter,
  MapExtent,
  Timeslice,
  TooltipState,
} from '../../../common/descriptor_types';
import { INITIAL_LOCATION } from '../../../common/constants';
import { TimeRange } from '../../../../../../src/plugins/data/public';

export interface MapExtentState {
  zoom: number;
  extent: MapExtent;
  center: MapCenter;
}

export type MapViewContext = MapExtentState & {
  buffer: MapExtent;
};

export type MapContext = Partial<MapViewContext> & {
  scrollZoom: boolean;
  mouseCoordinates?: {
    lat: number;
    lon: number;
  };
  timeFilters?: TimeRange;
  timeslice?: Timeslice;
  query?: Query;
  filters: Filter[];
  drawState?: DrawState;
  editState?: EditState;
  searchSessionId?: string;
  searchSessionMapBuffer?: MapExtent;
};

export type MapSettings = {
  autoFitToDataBounds: boolean;
  backgroundColor: string;
  disableInteractive: boolean;
  disableTooltipControl: boolean;
  hideToolbarOverlay: boolean;
  hideLayerControl: boolean;
  hideViewControl: boolean;
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
  showScaleControl: boolean;
  showSpatialFilters: boolean;
  showTimesliderToggleButton: boolean;
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
