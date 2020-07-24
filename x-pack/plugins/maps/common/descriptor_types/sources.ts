/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint-disable @typescript-eslint/consistent-type-definitions */

import { FeatureCollection } from 'geojson';
import { Query } from 'src/plugins/data/public';
import {
  AGG_TYPE,
  GRID_RESOLUTION,
  RENDER_AS,
  SORT_ORDER,
  SCALING_TYPES,
  MVT_FIELD_TYPE,
} from '../constants';
import { StyleDescriptor, VectorStyleDescriptor } from './style_property_descriptor_types';
import { DataRequestDescriptor } from './data_request_descriptor_types';

export type AttributionDescriptor = {
  attributionText?: string;
  attributionUrl?: string;
};

export type AbstractSourceDescriptor = {
  id?: string;
  type: string;
  applyGlobalQuery?: boolean;
};

export type EMSTMSSourceDescriptor = AbstractSourceDescriptor & {
  // id: EMS TMS layer id. Used when !isAutoSelect
  isAutoSelect: boolean;
};

export type EMSFileSourceDescriptor = AbstractSourceDescriptor & {
  // id: EMS file id
  id: string;
  tooltipProperties: string[];
};

export type AbstractESSourceDescriptor = AbstractSourceDescriptor & {
  // id: UUID
  indexPatternId: string;
  geoField?: string;
};

export type AggDescriptor = {
  field?: string; // count aggregation does not require field. All other aggregation types do
  label?: string;
  type: AGG_TYPE;
};

export type AbstractESAggSourceDescriptor = AbstractESSourceDescriptor & {
  metrics: AggDescriptor[];
};

export type ESGeoGridSourceDescriptor = AbstractESAggSourceDescriptor & {
  requestType?: RENDER_AS;
  resolution?: GRID_RESOLUTION;
};

export type ESSearchSourceDescriptor = AbstractESSourceDescriptor & {
  filterByMapBounds?: boolean;
  tooltipProperties?: string[];
  sortField?: string;
  sortOrder?: SORT_ORDER;
  scalingType: SCALING_TYPES;
  topHitsSplitField?: string;
  topHitsSize?: number;
};

export type ESPewPewSourceDescriptor = AbstractESAggSourceDescriptor & {
  sourceGeoField: string;
  destGeoField: string;
};

export type ESTermSourceDescriptor = AbstractESAggSourceDescriptor & {
  indexPatternTitle?: string;
  term?: string; // term field name
  whereQuery?: Query;
};

export type KibanaRegionmapSourceDescriptor = AbstractSourceDescriptor & {
  name: string;
};

// This is for symmetry with other sources only.
// It takes no additional configuration since  all params are in the .yml.
export type KibanaTilemapSourceDescriptor = AbstractSourceDescriptor;

export type WMSSourceDescriptor = AbstractSourceDescriptor & {
  serviceUrl: string;
  layers: string;
  styles: string;
  attributionText: string;
  attributionUrl: string;
};

export type XYZTMSSourceDescriptor = AbstractSourceDescriptor &
  AttributionDescriptor & {
    urlTemplate: string;
  };

export type MVTFieldDescriptor = {
  name: string;
  type: MVT_FIELD_TYPE;
};

export type TiledSingleLayerVectorSourceSettings = {
  urlTemplate: string;
  layerName: string;

  // These are the min/max zoom levels of the availability of the a particular layerName in the tileset at urlTemplate.
  // These are _not_ the visible zoom-range of the data on a map.
  // These are important so mapbox does not issue invalid requests based on the zoom level.

  // Tiled layer data cannot be displayed at lower levels of zoom than that they are stored in the tileset.
  // e.g. building footprints at level 14 cannot be displayed at level 0.
  minSourceZoom: number;
  // Tiled layer data can be displayed at higher levels of zoom than that they are stored in the tileset.
  // e.g. EMS basemap data from level 14 is at most detailed resolution and can be displayed at higher levels
  maxSourceZoom: number;

  fields: MVTFieldDescriptor[];
};

export type TiledSingleLayerVectorSourceDescriptor = AbstractSourceDescriptor &
  TiledSingleLayerVectorSourceSettings & {
    tooltipProperties: string[];
  };

export type GeojsonFileSourceDescriptor = {
  __featureCollection: FeatureCollection;
  name: string;
  type: string;
};

export type JoinDescriptor = {
  leftField?: string;
  right: ESTermSourceDescriptor;
};

// todo : this union type is incompatible with dynamic extensibility of sources.
// Reconsider using SourceDescriptor in type signatures for top-level classes
export type SourceDescriptor =
  | AbstractSourceDescriptor
  | XYZTMSSourceDescriptor
  | WMSSourceDescriptor
  | KibanaTilemapSourceDescriptor
  | KibanaRegionmapSourceDescriptor
  | ESTermSourceDescriptor
  | ESSearchSourceDescriptor
  | ESGeoGridSourceDescriptor
  | EMSFileSourceDescriptor
  | ESPewPewSourceDescriptor
  | TiledSingleLayerVectorSourceDescriptor
  | EMSTMSSourceDescriptor
  | EMSFileSourceDescriptor
  | GeojsonFileSourceDescriptor;

export type LayerDescriptor = {
  __dataRequests?: DataRequestDescriptor[];
  __isInErrorState?: boolean;
  __isPreviewLayer?: boolean;
  __errorMessage?: string;
  __trackedLayerDescriptor?: LayerDescriptor;
  alpha?: number;
  id: string;
  label?: string | null;
  areLabelsOnTop?: boolean;
  minZoom?: number;
  maxZoom?: number;
  sourceDescriptor: SourceDescriptor | null;
  type?: string;
  visible?: boolean;
  style?: StyleDescriptor | null;
  query?: Query;
};

export type VectorLayerDescriptor = LayerDescriptor & {
  joins?: JoinDescriptor[];
  style?: VectorStyleDescriptor;
};

export type RangeFieldMeta = {
  min: number;
  max: number;
  delta: number;
  isMinOutsideStdRange?: boolean;
  isMaxOutsideStdRange?: boolean;
};

export type Category = {
  key: string;
  count: number;
};

export type CategoryFieldMeta = {
  categories: Category[];
};

export type GeometryTypes = {
  isPointsOnly: boolean;
  isLinesOnly: boolean;
  isPolygonsOnly: boolean;
};

export type StyleMetaDescriptor = {
  geometryTypes?: GeometryTypes;
  fieldMeta: {
    [key: string]: {
      range: RangeFieldMeta;
      categories: CategoryFieldMeta;
    };
  };
};
