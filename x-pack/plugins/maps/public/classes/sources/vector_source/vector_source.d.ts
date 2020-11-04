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
  MapFilters,
  MapQuery,
  VectorSourceRequestMeta,
  VectorSourceSyncMeta,
} from '../../../../common/descriptor_types';
import { VECTOR_SHAPE_TYPE } from '../../../../common/constants';
import { ITooltipProperty } from '../../tooltips/tooltip_property';
import { DataRequest } from '../../util/data_request';

export interface SourceTooltipConfig {
  tooltipContent: string | null;
  areResultsTrimmed: boolean;
}

export type GeoJsonFetchMeta = ESSearchSourceResponseMeta;

export type GeoJsonWithMeta = {
  data: FeatureCollection;
  meta?: GeoJsonFetchMeta;
};

export type BoundsFilters = {
  applyGlobalQuery: boolean;
  filters: Filter[];
  query?: MapQuery;
  sourceQuery?: MapQuery;
  timeFilters: TimeRange;
};

export interface IVectorSource extends ISource {
  getTooltipProperties(properties: GeoJsonProperties): Promise<ITooltipProperty[]>;
  getBoundsForFilters(
    boundsFilters: BoundsFilters,
    registerCancelCallback: (callback: () => void) => void
  ): MapExtent | null;
  getGeoJsonWithMeta(
    layerName: string,
    searchFilters: MapFilters,
    registerCancelCallback: (callback: () => void) => void,
    isRequestStillActive: () => boolean
  ): Promise<GeoJsonWithMeta>;

  getFields(): Promise<IField[]>;
  getFieldByName(fieldName: string): IField | null;
  getLeftJoinFields(): Promise<IField[]>;
  getSyncMeta(): VectorSourceSyncMeta;
  getFieldNames(): string[];
  getApplyGlobalQuery(): boolean;
  createField({ fieldName }: { fieldName: string }): IField;
  canFormatFeatureProperties(): boolean;
  getSupportedShapeTypes(): Promise<VECTOR_SHAPE_TYPE[]>;
  isBoundsAware(): boolean;
  getSourceTooltipContent(sourceDataRequest?: DataRequest): SourceTooltipConfig;
}

export class AbstractVectorSource extends AbstractSource implements IVectorSource {
  getTooltipProperties(properties: GeoJsonProperties): Promise<ITooltipProperty[]>;
  getBoundsForFilters(
    boundsFilters: BoundsFilters,
    registerCancelCallback: (callback: () => void) => void
  ): MapExtent | null;
  getGeoJsonWithMeta(
    layerName: string,
    searchFilters: VectorSourceRequestMeta,
    registerCancelCallback: (callback: () => void) => void,
    isRequestStillActive: () => boolean
  ): Promise<GeoJsonWithMeta>;

  getFields(): Promise<IField[]>;
  getFieldByName(fieldName: string): IField | null;
  getLeftJoinFields(): Promise<IField[]>;
  getSyncMeta(): VectorSourceSyncMeta;
  getSupportedShapeTypes(): Promise<VECTOR_SHAPE_TYPE[]>;
  canFormatFeatureProperties(): boolean;
  getApplyGlobalQuery(): boolean;
  getFieldNames(): string[];
  createField({ fieldName }: { fieldName: string }): IField;
  isBoundsAware(): boolean;
  getSourceTooltipContent(sourceDataRequest?: DataRequest): SourceTooltipConfig;
}

export interface ITiledSingleLayerVectorSource extends IVectorSource {
  getUrlTemplateWithMeta(
    searchFilters: VectorSourceRequestMeta
  ): Promise<{
    layerName: string;
    urlTemplate: string;
    minSourceZoom: number;
    maxSourceZoom: number;
  }>;
  getMinZoom(): number;
  getMaxZoom(): number;
  getLayerName(): string;
}
