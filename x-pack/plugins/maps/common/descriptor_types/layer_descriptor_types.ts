/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/consistent-type-definitions */
import type { Feature } from 'geojson';
import type { Query } from 'src/plugins/data/public';
import {
  KBN_FEATURE_COUNT,
  KBN_IS_TILE_COMPLETE,
  KBN_METADATA_FEATURE,
  KBN_VECTOR_SHAPE_TYPE_COUNTS,
} from '../constants';
import type { VectorShapeTypeCounts } from '../get_geometry_counts';
import type { DataRequestDescriptor } from './data_request_descriptor_types';
import type { AbstractSourceDescriptor, TermJoinSourceDescriptor } from './source_descriptor_types';
import type {
  FieldMeta,
  HeatmapStyleDescriptor,
  StyleDescriptor,
  VectorStyleDescriptor,
} from './style_property_descriptor_types';

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
    [KBN_METADATA_FEATURE]: true;
    [KBN_IS_TILE_COMPLETE]: boolean;
    [KBN_FEATURE_COUNT]: number;
    [KBN_VECTOR_SHAPE_TYPE_COUNTS]: VectorShapeTypeCounts;
    fieldMeta?: FieldMeta;
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
  joins?: JoinDescriptor[];
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
  style: VectorStyleDescriptor;
};

export type HeatmapLayerDescriptor = LayerDescriptor & {
  style: HeatmapStyleDescriptor;
};
