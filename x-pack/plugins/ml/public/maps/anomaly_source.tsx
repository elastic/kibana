/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { ReactElement } from 'react';
import {
  FieldFormatter,
  MAX_ZOOM,
  MIN_ZOOM,
  VECTOR_SHAPE_TYPE,
  VectorSourceRequestMeta,
} from '../../../maps/common';
import { AbstractSourceDescriptor, MapExtent } from '../../../maps/common/descriptor_types';
import { ITooltipProperty, GEOJSON_FEATURE_ID_PROPERTY_NAME } from '../../../maps/public';
import {
  AnomalySourceField,
  AnomalySourceTooltipProperty,
  ANOMALY_SOURCE_FIELDS,
} from './anomaly_source_field';
import type { Adapters } from '../../../../../src/plugins/inspector/common/adapters';
import type { GeoJsonWithMeta } from '../../../maps/public';
import type { IField } from '../../../maps/public';
import type { Attribution, ImmutableSourceProperty, PreIndexedShape } from '../../../maps/public';
import type { SourceEditorArgs } from '../../../maps/public';
import type { DataRequest } from '../../../maps/public';
import type { IVectorSource, SourceStatus } from '../../../maps/public';
import { ML_ANOMALY } from './anomaly_source_factory';
import { getResultsForJobId, ML_ANOMALY_LAYERS, MlAnomalyLayersType } from './util';
import { UpdateAnomalySourceEditor } from './update_anomaly_source_editor';
import type { MlApiServices } from '../application/services/ml_api_service';

const RESULT_LIMIT = 1000;

export interface AnomalySourceDescriptor extends AbstractSourceDescriptor {
  jobId: string;
  typicalActual: MlAnomalyLayersType;
}

export class AnomalySource implements IVectorSource {
  static mlResultsService: MlApiServices['results'];
  static canGetJobs: boolean;

  static createDescriptor(descriptor: Partial<AnomalySourceDescriptor>) {
    if (typeof descriptor.jobId !== 'string') {
      throw new Error('Job id is required for anomaly layer creation');
    }

    return {
      type: ML_ANOMALY,
      jobId: descriptor.jobId,
      typicalActual: descriptor.typicalActual || ML_ANOMALY_LAYERS.ACTUAL,
    };
  }

  private readonly _descriptor: AnomalySourceDescriptor;

  constructor(sourceDescriptor: Partial<AnomalySourceDescriptor>, adapters?: Adapters) {
    this._descriptor = AnomalySource.createDescriptor(sourceDescriptor);
  }

  async getGeoJsonWithMeta(
    layerName: string,
    searchFilters: VectorSourceRequestMeta,
    registerCancelCallback: (callback: () => void) => void,
    isRequestStillActive: () => boolean
  ): Promise<GeoJsonWithMeta> {
    const results = await getResultsForJobId(
      AnomalySource.mlResultsService,
      this._descriptor.jobId,
      this._descriptor.typicalActual,
      searchFilters
    );

    return {
      data: results,
      meta: {
        // Set this to true if data is incomplete (e.g. capping number of results to first 1k)
        areResultsTrimmed: results.features.length === RESULT_LIMIT,
      },
    };
  }

  canFormatFeatureProperties(): boolean {
    return false;
  }

  cloneDescriptor(): AnomalySourceDescriptor {
    return {
      type: this._descriptor.type,
      jobId: this._descriptor.jobId,
      typicalActual: this._descriptor.typicalActual,
    };
  }

  createField({ fieldName }: { fieldName: string }): IField {
    if (fieldName !== 'record_score') {
      throw new Error('Record score field name is required');
    }
    return new AnomalySourceField({ source: this, field: fieldName });
  }

  async createFieldFormatter(field: IField): Promise<FieldFormatter | null> {
    return null;
  }

  destroy(): void {}

  getApplyGlobalQuery(): boolean {
    return true;
  }

  getApplyForceRefresh(): boolean {
    return false;
  }

  getApplyGlobalTime(): boolean {
    return true;
  }

  async getAttributions(): Promise<Attribution[]> {
    return [];
  }

  async getBoundsForFilters(
    boundsFilters: object,
    registerCancelCallback: (callback: () => void) => void
  ): Promise<MapExtent | null> {
    return null;
  }

  async getDisplayName(): Promise<string> {
    return i18n.translate('xpack.ml.maps.anomalySource.displayLabel', {
      defaultMessage: '{typicalActual} for {jobId}',
      values: {
        typicalActual: this._descriptor.typicalActual,
        jobId: this._descriptor.jobId,
      },
    });
  }

  getFieldByName(fieldName: string): IField | null {
    if (fieldName === 'record_score') {
      return new AnomalySourceField({ source: this, field: fieldName });
    }
    return null;
  }

  getSourceStatus(sourceDataRequest?: DataRequest): SourceStatus {
    const meta = sourceDataRequest ? sourceDataRequest.getMeta() : null;

    if (meta?.areResultsTrimmed) {
      return {
        tooltipContent: i18n.translate('xpack.ml.maps.resultsTrimmedMsg', {
          defaultMessage: `Results limited to first {count} documents.`,
          values: { count: RESULT_LIMIT },
        }),
        areResultsTrimmed: true,
      };
    }

    return {
      tooltipContent: null,
      areResultsTrimmed: false,
    };
  }

  getType(): string {
    return this._descriptor.type;
  }

  isMvt() {
    return true;
  }

  showJoinEditor(): boolean {
    // Ignore, only show if joins are enabled for current configuration
    return false;
  }

  getFieldNames(): string[] {
    return Object.keys(ANOMALY_SOURCE_FIELDS);
  }

  async getFields(): Promise<IField[]> {
    return this.getFieldNames().map((field) => new AnomalySourceField({ source: this, field }));
  }

  getGeoGridPrecision(zoom: number): number {
    return 0;
  }

  isBoundsAware(): boolean {
    return false;
  }

  async getImmutableProperties(): Promise<ImmutableSourceProperty[]> {
    return [
      {
        label: i18n.translate('xpack.ml.maps.anomalySourcePropLabel', {
          defaultMessage: 'Job Id',
        }),
        value: this._descriptor.jobId,
      },
    ];
  }

  async isTimeAware(): Promise<boolean> {
    return true;
  }

  renderSourceSettingsEditor({ onChange }: SourceEditorArgs): ReactElement<any> | null {
    return (
      <UpdateAnomalySourceEditor
        onChange={onChange}
        typicalActual={this._descriptor.typicalActual}
      />
    );
  }

  async supportsFitToBounds(): Promise<boolean> {
    // Return true if you can compute bounds of data
    return true;
  }

  async getLicensedFeatures(): Promise<[]> {
    return [];
  }

  getMaxZoom(): number {
    return MAX_ZOOM;
  }

  getMinZoom(): number {
    return MIN_ZOOM;
  }

  getSourceTooltipContent(sourceDataRequest?: DataRequest): SourceStatus {
    const meta = sourceDataRequest ? sourceDataRequest.getMeta() : null;
    return {
      tooltipContent: i18n.translate('xpack.ml.maps.sourceTooltip', {
        defaultMessage: 'Shows anomalies',
      }),
      // set to true if data is incomplete (we limit to first 1000 results)
      areResultsTrimmed: meta?.areResultsTrimmed ?? false,
    };
  }

  async getSupportedShapeTypes(): Promise<VECTOR_SHAPE_TYPE[]> {
    return this._descriptor.typicalActual === ML_ANOMALY_LAYERS.TYPICAL_TO_ACTUAL
      ? [VECTOR_SHAPE_TYPE.LINE]
      : [VECTOR_SHAPE_TYPE.POINT];
  }

  getSyncMeta(): object | null {
    return {
      jobId: this._descriptor.jobId,
      typicalActual: this._descriptor.typicalActual,
    };
  }

  async getTooltipProperties(properties: { [p: string]: any } | null): Promise<ITooltipProperty[]> {
    const tooltipProperties: ITooltipProperty[] = [];
    for (const key in properties) {
      if (key === GEOJSON_FEATURE_ID_PROPERTY_NAME) {
        continue;
      }
      if (properties.hasOwnProperty(key)) {
        tooltipProperties.push(new AnomalySourceTooltipProperty(key, properties[key]));
      }
    }
    return tooltipProperties;
  }

  isFieldAware(): boolean {
    return true;
  }

  // This is for type-ahead support in the UX for by-value styling
  async getValueSuggestions(field: IField, query: string): Promise<string[]> {
    return [];
  }

  // -----------------
  // API ML probably can ignore
  getAttributionProvider() {
    return null;
  }

  getIndexPatternIds(): string[] {
    // IGNORE: This is only relevant if your source is backed by an index-pattern
    return [];
  }

  getInspectorAdapters(): Adapters | undefined {
    // IGNORE: This is only relevant if your source is backed by an index-pattern
    return undefined;
  }

  getJoinsDisabledReason(): string | null {
    // IGNORE: This is only relevant if your source can be joined to other data
    return null;
  }

  async getLeftJoinFields(): Promise<IField[]> {
    // IGNORE: This is only relevant if your source can be joined to other data
    return [];
  }

  async getPreIndexedShape(
    properties: { [p: string]: any } | null
  ): Promise<PreIndexedShape | null> {
    // IGNORE: This is only relevant if your source is backed by an index-pattern
    return null;
  }

  getQueryableIndexPatternIds(): string[] {
    // IGNORE: This is only relevant if your source is backed by an index-pattern
    return [];
  }

  isESSource(): boolean {
    // IGNORE: This is only relevant if your source is backed by an index-pattern
    return false;
  }

  isFilterByMapBounds(): boolean {
    // Only implement if you can query this data with a bounding-box
    return false;
  }

  isGeoGridPrecisionAware(): boolean {
    // Ignore: only implement if your data is scale-dependent (probably not)
    return false;
  }

  isQueryAware(): boolean {
    return true;
  }

  isRefreshTimerAware(): boolean {
    // Allow force-refresh when user clicks "refresh" button in the global time-picker
    return true;
  }

  async getTimesliceMaskFieldName() {
    return null;
  }

  async supportsFeatureEditing() {
    return false;
  }

  hasTooltipProperties() {
    return true;
  }

  async addFeature() {
    // should not be called
  }

  async deleteFeature() {
    // should not be called
  }

  getUpdateDueToTimeslice() {
    // TODO
    return true;
  }

  async getDefaultFields(): Promise<Record<string, Record<string, string>>> {
    return {};
  }
}
