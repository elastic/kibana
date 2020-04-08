/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint-disable @typescript-eslint/consistent-type-definitions */

import { FeatureCollection } from 'geojson';
import { AbstractSource, ISource } from './source';
import { IField } from '../fields/field';
import {
  ESSearchSourceResponseMeta,
  MapExtent,
  VectorSourceRequestMeta,
  VectorSourceSyncMeta,
} from '../../../common/descriptor_types';
import { VECTOR_SHAPE_TYPES } from './vector_feature_types';

export type GeoJsonFetchMeta = ESSearchSourceResponseMeta;

export type GeoJsonWithMeta = {
  data: FeatureCollection;
  meta?: GeoJsonFetchMeta;
};

export interface IVectorSource extends ISource {
  getBoundsForFilters(searchFilters: VectorSourceRequestMeta): MapExtent;
  getGeoJsonWithMeta(
    layerName: 'string',
    searchFilters: unknown[],
    registerCancelCallback: (callback: () => void) => void
  ): Promise<GeoJsonWithMeta>;

  getFields(): Promise<IField[]>;
  getFieldByName(fieldName: string): IField;
  getSyncMeta(): VectorSourceSyncMeta;
  getFieldNames(): string[];
  getApplyGlobalQuery(): boolean;
}

export class AbstractVectorSource extends AbstractSource implements IVectorSource {
  getBoundsForFilters(searchFilters: VectorSourceRequestMeta): MapExtent;
  getGeoJsonWithMeta(
    layerName: 'string',
    searchFilters: unknown[],
    registerCancelCallback: (callback: () => void) => void
  ): Promise<GeoJsonWithMeta>;

  getFields(): Promise<IField[]>;
  getFieldByName(fieldName: string): IField;
  getSyncMeta(): VectorSourceSyncMeta;
  getSupportedShapeTypes(): VECTOR_SHAPE_TYPES[];
  canFormatFeatureProperties(): boolean;
  getApplyGlobalQuery(): boolean;
}

type TiledSingleLayerVectorSourceMeta = {
  urlTemplate: string;
  layerName: string;

  // These are the min/max zoom levels of the availability of the a particle layerName in the tileset at urlTemplate.
  // These are _not_ the visible zoom-range of the data on a map.
  // Tiled data can be displayed at higher levels of zoom than that they are stored in the tileset.
  // e.g. EMS basemap data from level 16 can be displayed at higher levels
  minZoom: number;
  maxZoom: number;
};

export interface ITiledSingleLayerVectorSource extends IVectorSource {
  getUrlTemplateWithMeta(): Promise<TiledSingleLayerVectorSourceMeta>;
}
