/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Query } from '@kbn/data-plugin/common';
import { FeatureCollection, GeoJsonProperties, Geometry, Position } from 'geojson';
import { Filter } from '@kbn/es-query';
import { TimeRange } from '@kbn/data-plugin/public';
import { VECTOR_SHAPE_TYPE } from '../../../../common/constants';
import { ITooltipProperty, TooltipProperty } from '../../tooltips/tooltip_property';
import { AbstractSource, ISource } from '../source';
import { IField } from '../../fields/field';
import {
  ESSearchSourceResponseMeta,
  MapExtent,
  Timeslice,
  VectorSourceRequestMeta,
} from '../../../../common/descriptor_types';
import { DataRequest } from '../../util/data_request';

export interface SourceStatus {
  tooltipContent: string | null;
  areResultsTrimmed: boolean;
  isDeprecated?: boolean;
}

export type GeoJsonFetchMeta = ESSearchSourceResponseMeta;

export interface GeoJsonWithMeta {
  data: FeatureCollection;
  meta?: GeoJsonFetchMeta;
}

export interface BoundsRequestMeta {
  applyGlobalQuery: boolean;
  applyGlobalTime: boolean;
  filters: Filter[];
  query?: Query;
  sourceQuery?: Query;
  timeFilters: TimeRange;
  timeslice?: Timeslice;
  joinKeyFilter?: Filter;
}

export interface IVectorSource extends ISource {
  isMvt(): boolean;
  getTooltipProperties(properties: GeoJsonProperties): Promise<ITooltipProperty[]>;
  getBoundsForFilters(
    layerDataFilters: BoundsRequestMeta,
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
  showJoinEditor(): boolean;
  getJoinsDisabledReason(): string | null;

  /*
   * Vector layer avoids unnecessarily re-fetching source data.
   * Use getSyncMeta to expose fields that require source data re-fetch when changed.
   */
  getSyncMeta(): object | null;

  getFieldNames(): string[];
  createField({ fieldName }: { fieldName: string }): IField;
  hasTooltipProperties(): boolean;
  getSupportedShapeTypes(): Promise<VECTOR_SHAPE_TYPE[]>;
  isBoundsAware(): boolean;
  getSourceStatus(sourceDataRequest?: DataRequest): SourceStatus;
  getTimesliceMaskFieldName(): Promise<string | null>;
  supportsFeatureEditing(): Promise<boolean>;
  getDefaultFields(): Promise<Record<string, Record<string, string>>>;
  addFeature(
    geometry: Geometry | Position[],
    defaultFields: Record<string, Record<string, string>>
  ): Promise<void>;
  deleteFeature(featureId: string): Promise<void>;
}

export class AbstractVectorSource extends AbstractSource implements IVectorSource {
  getFieldNames(): string[] {
    return [];
  }

  isMvt() {
    return false;
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
    boundsFilters: BoundsRequestMeta,
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

  getJoinsDisabledReason(): string | null {
    return null;
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

  getSourceStatus(sourceDataRequest?: DataRequest): SourceStatus {
    return { tooltipContent: null, areResultsTrimmed: false };
  }

  getSyncMeta(): object | null {
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
