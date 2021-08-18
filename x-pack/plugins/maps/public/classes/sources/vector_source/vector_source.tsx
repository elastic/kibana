/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FeatureCollection, GeoJsonProperties, Geometry, Position } from 'geojson';
import { Filter, TimeRange } from 'src/plugins/data/public';
import { VECTOR_SHAPE_TYPE } from '../../../../common/constants';
import { TooltipProperty, ITooltipProperty } from '../../tooltips/tooltip_property';
import { AbstractSource, ISource } from '../source';
import { IField } from '../../fields/field';
import {
  ESSearchSourceResponseMeta,
  MapExtent,
  MapQuery,
  Timeslice,
  VectorSourceRequestMeta,
  VectorSourceSyncMeta,
} from '../../../../common/descriptor_types';
import { DataRequest } from '../../util/data_request';

export interface SourceTooltipConfig {
  tooltipContent: string | null;
  areResultsTrimmed: boolean;
  isDeprecated?: boolean;
}

export type GeoJsonFetchMeta = ESSearchSourceResponseMeta;

export interface GeoJsonWithMeta {
  data: FeatureCollection;
  meta?: GeoJsonFetchMeta;
}

export interface BoundsFilters {
  applyGlobalQuery: boolean;
  applyGlobalTime: boolean;
  filters: Filter[];
  query?: MapQuery;
  sourceQuery?: MapQuery;
  timeFilters: TimeRange;
  timeslice?: Timeslice;
}

export interface IVectorSource extends ISource {
  getTooltipProperties(properties: GeoJsonProperties): Promise<ITooltipProperty[]>;
  getBoundsForFilters(
    boundsFilters: BoundsFilters,
    registerCancelCallback: (callback: () => void) => void
  ): Promise<MapExtent | null>;
  getGeoJsonWithMeta(
    layerName: string,
    searchFilters: VectorSourceRequestMeta,
    registerCancelCallback: (callback: () => void) => void,
    isRequestStillActive: () => boolean
  ): Promise<GeoJsonWithMeta>;

  getFields(): Promise<IField[]>;
  getFieldByName(fieldName: string): IField | null;
  getLeftJoinFields(): Promise<IField[]>;
  getSyncMeta(): VectorSourceSyncMeta | null;
  getFieldNames(): string[];
  createField({ fieldName }: { fieldName: string }): IField;
  hasTooltipProperties(): boolean;
  getSupportedShapeTypes(): Promise<VECTOR_SHAPE_TYPE[]>;
  isBoundsAware(): boolean;
  getSourceTooltipContent(sourceDataRequest?: DataRequest): SourceTooltipConfig;
  getTimesliceMaskFieldName(): Promise<string | null>;
  supportsFeatureEditing(): Promise<boolean>;
  getDefaultFields(): Promise<Record<string, Record<string, string>>>;
  addFeature(
    geometry: Geometry | Position[],
    defaultFields: Record<string, Record<string, string>>
  ): Promise<void>;
  deleteFeature(featureId: string): Promise<void>;
  isFilterByMapBounds(): boolean;
}

export class AbstractVectorSource extends AbstractSource implements IVectorSource {
  getFieldNames(): string[] {
    return [];
  }

  createField({ fieldName }: { fieldName: string }): IField {
    throw new Error('Not implemented');
  }

  getFieldByName(fieldName: string): IField | null {
    return this.createField({ fieldName });
  }

  isFilterByMapBounds() {
    return false;
  }

  isBoundsAware(): boolean {
    return false;
  }

  async supportsFitToBounds(): Promise<boolean> {
    return true;
  }

  async getBoundsForFilters(
    boundsFilters: BoundsFilters,
    registerCancelCallback: (callback: () => void) => void
  ): Promise<MapExtent | null> {
    return null;
  }

  async getFields(): Promise<IField[]> {
    return [];
  }

  async getLeftJoinFields(): Promise<IField[]> {
    return [];
  }

  async getGeoJsonWithMeta(
    layerName: string,
    searchFilters: VectorSourceRequestMeta,
    registerCancelCallback: (callback: () => void) => void,
    isRequestStillActive: () => boolean
  ): Promise<GeoJsonWithMeta> {
    throw new Error('Should implement VectorSource#getGeoJson');
  }

  hasTooltipProperties() {
    return false;
  }

  // Allow source to filter and format feature properties before displaying to user
  async getTooltipProperties(properties: GeoJsonProperties): Promise<ITooltipProperty[]> {
    const tooltipProperties: ITooltipProperty[] = [];
    for (const key in properties) {
      if (key.startsWith('__kbn')) {
        // these are system properties and should be ignored
        continue;
      }
      tooltipProperties.push(new TooltipProperty(key, key, properties[key]));
    }
    return tooltipProperties;
  }

  async isTimeAware() {
    return false;
  }

  showJoinEditor() {
    return true;
  }

  async getSupportedShapeTypes() {
    return [VECTOR_SHAPE_TYPE.POINT, VECTOR_SHAPE_TYPE.LINE, VECTOR_SHAPE_TYPE.POLYGON];
  }

  getSourceTooltipContent(sourceDataRequest?: DataRequest): SourceTooltipConfig {
    return { tooltipContent: null, areResultsTrimmed: false };
  }

  getSyncMeta(): VectorSourceSyncMeta | null {
    return null;
  }

  async getTimesliceMaskFieldName(): Promise<string | null> {
    return null;
  }

  async addFeature(
    geometry: Geometry | Position[],
    defaultFields: Record<string, Record<string, string>>
  ) {
    throw new Error('Should implement VectorSource#addFeature');
  }

  async deleteFeature(featureId: string): Promise<void> {
    throw new Error('Should implement VectorSource#deleteFeature');
  }

  async supportsFeatureEditing(): Promise<boolean> {
    return false;
  }

  async getDefaultFields(): Promise<Record<string, Record<string, string>>> {
    return {};
  }
}
