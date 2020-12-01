/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint-disable @typescript-eslint/consistent-type-definitions */

import { FeatureCollection } from 'geojson';
import { Query } from 'src/plugins/data/public';
import { SortDirection } from 'src/plugins/data/common/search';
import { AGG_TYPE, GRID_RESOLUTION, RENDER_AS, SCALING_TYPES, MVT_FIELD_TYPE } from '../constants';

export type AttributionDescriptor = {
  attributionText?: string;
  attributionUrl?: string;
};

export type AbstractSourceDescriptor = {
  id?: string;
  type: string;
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
  id: string;
  indexPatternId: string;
  geoField?: string;
  applyGlobalQuery: boolean;
  applyGlobalTime: boolean;
};

type AbstractAggDescriptor = {
  type: AGG_TYPE;
  label?: string;
};

export type CountAggDescriptor = AbstractAggDescriptor & {
  type: AGG_TYPE.COUNT;
};

export type FieldedAggDescriptor = AbstractAggDescriptor & {
  type:
    | AGG_TYPE.UNIQUE_COUNT
    | AGG_TYPE.MAX
    | AGG_TYPE.MIN
    | AGG_TYPE.SUM
    | AGG_TYPE.AVG
    | AGG_TYPE.TERMS;
  field?: string;
};

export type AggDescriptor = CountAggDescriptor | FieldedAggDescriptor;

export type AbstractESAggSourceDescriptor = AbstractESSourceDescriptor & {
  metrics: AggDescriptor[];
};

export type ESGeoGridSourceDescriptor = AbstractESAggSourceDescriptor & {
  geoField: string;
  requestType: RENDER_AS;
  resolution: GRID_RESOLUTION;
};

export type ESSearchSourceDescriptor = AbstractESSourceDescriptor & {
  geoField: string;
  filterByMapBounds?: boolean;
  tooltipProperties?: string[];
  sortField: string;
  sortOrder: SortDirection;
  scalingType: SCALING_TYPES;
  topHitsSplitField: string;
  topHitsSize: number;
};

export type ESPewPewSourceDescriptor = AbstractESAggSourceDescriptor & {
  sourceGeoField: string;
  destGeoField: string;
};

export type ESTermSourceDescriptor = AbstractESAggSourceDescriptor & {
  indexPatternTitle?: string;
  term: string; // term field name
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
