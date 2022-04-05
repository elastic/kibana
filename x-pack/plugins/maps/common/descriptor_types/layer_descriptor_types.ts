/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/consistent-type-definitions */

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { Query } from 'src/plugins/data/public';
import { Feature } from 'geojson';
import {
  HeatmapStyleDescriptor,
  StyleDescriptor,
  VectorStyleDescriptor,
} from './style_property_descriptor_types';
import { DataRequestDescriptor } from './data_request_descriptor_types';
import { AbstractSourceDescriptor, TermJoinSourceDescriptor } from './source_descriptor_types';
import { LAYER_TYPE } from '../constants';

export type Attribution = {
  label: string;
  url: string;
};

export type JoinDescriptor = {
  leftField?: string;
  right: TermJoinSourceDescriptor;
};

export type TileMetaFeature = Feature & {
  properties: {
    'hits.total.relation': string;
    'hits.total.value': number;

    // For _mvt requests with "aggs" property in request: aggregation statistics returned in the pattern outined below
    // aggregations._count.min
    // aggregations._count.max
    // aggregations.<agg_name>.min
    // aggregations.<agg_name>.max
    [key: string]: number | string;
  };
};

export type LayerDescriptor = {
  __dataRequests?: DataRequestDescriptor[];
  __isInErrorState?: boolean;
  __isPreviewLayer?: boolean;
  __errorMessage?: string;
  __trackedLayerDescriptor?: LayerDescriptor;
  __areTilesLoaded?: boolean;
  __metaFromTiles?: TileMetaFeature[];
  alpha?: number;
  attribution?: Attribution;
  id: string;
  label?: string | null;
  areLabelsOnTop?: boolean;
  minZoom?: number;
  maxZoom?: number;
  sourceDescriptor: AbstractSourceDescriptor | null;
  type?: string;
  visible?: boolean;
  style?: StyleDescriptor | null;
  query?: Query;
  includeInFitToBounds?: boolean;
};

export type VectorLayerDescriptor = LayerDescriptor & {
  type: LAYER_TYPE.GEOJSON_VECTOR | LAYER_TYPE.MVT_VECTOR | LAYER_TYPE.BLENDED_VECTOR;
  joins?: JoinDescriptor[];
  style: VectorStyleDescriptor;
};

export type HeatmapLayerDescriptor = LayerDescriptor & {
  type: LAYER_TYPE.HEATMAP;
  style: HeatmapStyleDescriptor;
};
