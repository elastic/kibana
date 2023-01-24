/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  FeatureCollection,
  GeoJsonProperties,
  Geometry,
  MultiPolygon,
  Polygon,
  Position,
} from 'geojson';
import { i18n } from '@kbn/i18n';
import type { Query } from '@kbn/data-plugin/common';
import type { MapGeoJSONFeature } from '@kbn/mapbox-gl';
import { Filter } from '@kbn/es-query';
import type { TimeRange } from '@kbn/es-query';
import { Adapters } from '@kbn/inspector-plugin/common/adapters';
import { ActionExecutionContext, Action } from '@kbn/ui-actions-plugin/public';
import { GEO_JSON_TYPE, VECTOR_SHAPE_TYPE } from '../../../../common/constants';
import { TooltipFeatureAction } from '../../../../common/descriptor_types';
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
import { FeatureGeometryFilterForm } from '../../../connected_components/mb_map/tooltip_control/features_tooltip';

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
  embeddableSearchContext?: {
    query?: Query;
    filters: Filter[];
  };
  sourceQuery?: Query;
  timeFilters: TimeRange;
  timeslice?: Timeslice;
  isFeatureEditorOpenForLayer: boolean;
  joinKeyFilter?: Filter;
}

export interface GetFeatureActionsArgs {
  addFilters: ((filters: Filter[], actionId: string) => Promise<void>) | null;
  featureId: string;
  geoFieldNames: string[];
  getActionContext?: () => ActionExecutionContext;
  getFilterActions?: () => Promise<Action[]>;
  /*
   * Callback to get original geometry. Original geometry is only available for geojson sources.
   * There is no way to get original geometry for vector tiles.
   */
  getGeojsonGeometry: () => Geometry | null;
  /*
   * Feature from map. mbFeature.geometry may not be the original geometry, it has been simplified and trimmed to tile bounds.
   */
  mbFeature: MapGeoJSONFeature;
  onClose: () => void;
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
    isRequestStillActive: () => boolean,
    inspectorAdapters: Adapters
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

  /*
   * Create tooltip actions for a feature.
   */
  getFeatureActions({
    addFilters,
    featureId,
    geoFieldNames,
    getActionContext,
    getFilterActions,
    getGeojsonGeometry,
    mbFeature,
    onClose,
  }: GetFeatureActionsArgs): TooltipFeatureAction[];
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
    isRequestStillActive: () => boolean,
    inspectorAdapters: Adapters
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

  getFeatureActions({
    addFilters,
    geoFieldNames,
    getActionContext,
    getFilterActions,
    getGeojsonGeometry,
    mbFeature,
    onClose,
  }: GetFeatureActionsArgs): TooltipFeatureAction[] {
    if (geoFieldNames.length === 0 || addFilters === null) {
      return [];
    }

    const isPolygon =
      mbFeature.geometry.type === GEO_JSON_TYPE.POLYGON ||
      mbFeature.geometry.type === GEO_JSON_TYPE.MULTI_POLYGON;
    if (!isPolygon) {
      return [];
    }

    if (this.isMvt()) {
      // It is not possible to filter by geometry for vector tiles because there is no way to get original geometry
      // mbFeature.geometry may not be the original geometry, it has been simplified and trimmed to tile bounds
      return [];
    }

    const geojsonGeometry = getGeojsonGeometry();
    return geojsonGeometry
      ? [
          {
            label: i18n.translate('xpack.maps.tooltip.action.filterByGeometryLabel', {
              defaultMessage: 'Filter by geometry',
            }),
            id: 'FILTER_BY_GEOMETRY_ACTION',
            form: (
              <FeatureGeometryFilterForm
                onClose={onClose}
                geoFieldNames={geoFieldNames}
                addFilters={addFilters}
                getFilterActions={getFilterActions}
                getActionContext={getActionContext}
                geometry={geojsonGeometry as Polygon | MultiPolygon}
              />
            ),
          },
        ]
      : [];
  }
}
