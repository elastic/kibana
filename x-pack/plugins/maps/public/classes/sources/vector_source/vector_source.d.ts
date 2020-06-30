/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint-disable @typescript-eslint/consistent-type-definitions */

import { FeatureCollection, GeoJsonProperties, Geometry } from 'geojson';
import { Filter, TimeRange } from 'src/plugins/data/public';
import { AbstractSource, ISource } from '../source';
import { IField } from '../../fields/field';
import {
  ESSearchSourceResponseMeta,
  MapExtent,
  MapQuery,
  VectorSourceRequestMeta,
  VectorSourceSyncMeta,
} from '../../../../common/descriptor_types';
import { VECTOR_SHAPE_TYPE } from '../../../../common/constants';
import { ITooltipProperty } from '../../tooltips/tooltip_property';

export type GeoJsonFetchMeta = ESSearchSourceResponseMeta;

export type GeoJsonWithMeta = {
  data: FeatureCollection;
  meta?: GeoJsonFetchMeta;
};

export type BoundsFilters = {
  applyGlobalQuery: boolean;
  filters: Filter[];
  query: MapQuery;
  sourceQuery: MapQuery;
  timeFilters: TimeRange;
};

export interface IVectorSource extends ISource {
  filterAndFormatPropertiesToHtml(properties: GeoJsonProperties): Promise<ITooltipProperty[]>;
  getBoundsForFilters(
    boundsFilters: BoundsFilters,
    registerCancelCallback: (requestToken: symbol, callback: () => void) => void
  ): MapExtent | null;
  getGeoJsonWithMeta(
    layerName: 'string',
    searchFilters: unknown[],
    registerCancelCallback: (callback: () => void) => void
  ): Promise<GeoJsonWithMeta>;

  getFields(): Promise<IField[]>;
  getFieldByName(fieldName: string): IField | null;
  getSyncMeta(): VectorSourceSyncMeta;
  getFieldNames(): string[];
  getApplyGlobalQuery(): boolean;
  createField({ fieldName }: { fieldName: string }): IField;
  canFormatFeatureProperties(): boolean;
}

export class AbstractVectorSource extends AbstractSource implements IVectorSource {
  filterAndFormatPropertiesToHtml(properties: GeoJsonProperties): Promise<ITooltipProperty[]>;
  getBoundsForFilters(
    boundsFilters: BoundsFilters,
    registerCancelCallback: (requestToken: symbol, callback: () => void) => void
  ): MapExtent | null;
  getGeoJsonWithMeta(
    layerName: 'string',
    searchFilters: unknown[],
    registerCancelCallback: (callback: () => void) => void
  ): Promise<GeoJsonWithMeta>;

  getFields(): Promise<IField[]>;
  getFieldByName(fieldName: string): IField | null;
  getSyncMeta(): VectorSourceSyncMeta;
  getSupportedShapeTypes(): Promise<VECTOR_SHAPE_TYPE[]>;
  canFormatFeatureProperties(): boolean;
  getApplyGlobalQuery(): boolean;
  getFieldNames(): string[];
  createField({ fieldName }: { fieldName: string }): IField;
}

export interface ITiledSingleLayerVectorSource extends IVectorSource {
  getUrlTemplateWithMeta(): Promise<{
    layerName: string;
    urlTemplate: string;
    minSourceZoom: number;
    maxSourceZoom: number;
  }>;
  getMinZoom(): number;
  getMaxZoom(): number;
  getLayerName(): string;
}
