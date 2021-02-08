/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  FieldFormatter,
  MAX_ZOOM,
  MIN_ZOOM,
  SOURCE_TYPES,
  VECTOR_SHAPE_TYPE,
} from '../../../maps/common/constants';
import {
  AbstractSourceDescriptor,
  MapExtent,
  MapFilters,
  MapQuery,
  VectorSourceSyncMeta,
} from '../../../maps/common/descriptor_types';
import { ITooltipProperty, LICENSED_FEATURES } from '../../../maps/public';
import { RecordScoreField, RecordScoreTooltipProperty } from './record_score_field';
import type { Adapters } from '../../../../../src/plugins/inspector/common/adapters';
import type { GeoJsonWithMeta } from '../../../maps/public';
import type { IField } from '../../../maps/public';
import type { Attribution, ImmutableSourceProperty, PreIndexedShape } from '../../../maps/public';
import type { BoundsFilters } from '../../../maps/public';
import type { SourceEditorArgs } from '../../../maps/public';
import type { DataRequest } from '../../../maps/public';
import type { SourceTooltipConfig } from '../../../maps/public';
import type { IVectorSource } from '../../../maps/public';

export interface AnomalySourceDescriptor extends AbstractSourceDescriptor {
  jobId: string;
}

export class AnomalySource implements IVectorSource {
  static createDescriptor(descriptor: Partial<AnomalySourceDescriptor>) {
    // Fill in all the defaults
    return {
      type: SOURCE_TYPES.ML_ANOMALY,
      jobId: typeof descriptor.jobId === 'string' ? descriptor.jobId : 'foobar',
    };
  }

  private readonly _descriptor: AnomalySourceDescriptor;

  constructor(sourceDescriptor: Partial<AnomalySourceDescriptor>, adapters?: Adapters) {
    this._descriptor = AnomalySource.createDescriptor(sourceDescriptor);
  }

  async getGeoJsonWithMeta(
    layerName: string,
    searchFilters: MapFilters & {
      applyGlobalQuery: boolean;
      applyGlobalTime: boolean;
      fieldNames: string[];
      geogridPrecision?: number;
      sourceQuery?: MapQuery;
      sourceMeta: VectorSourceSyncMeta;
    },
    registerCancelCallback: (callback: () => void) => void,
    isRequestStillActive: () => boolean
  ): Promise<GeoJsonWithMeta> {
    return {
      data: {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [0, 0],
            },
            properties: {},
          },
        ],
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
    };
  }

  createField({ fieldName }: { fieldName: string }): IField {
    if (fieldName !== 'record_score') {
      throw new Error('PEBKAC');
    }
    return new RecordScoreField({ source: this });
  }

  async createFieldFormatter(field: IField): Promise<FieldFormatter | null> {
    return null;
  }

  destroy(): void {}

  getApplyGlobalQuery(): boolean {
    return false;
  }

  getApplyGlobalTime(): boolean {
    return false;
  }

  async getAttributions(): Promise<Attribution[]> {
    return [];
  }

  async getBoundsForFilters(
    boundsFilters: BoundsFilters,
    registerCancelCallback: (callback: () => void) => void
  ): Promise<MapExtent | null> {
    return null;
  }

  async getDisplayName(): Promise<string> {
    return i18n.translate('xpack.ml.maps.anomalySource.displayLabel', {
      defaultMessage: 'Anomaly Layer for jobId {jobId}',
      values: {
        jobId: this._descriptor.jobId,
      },
    });
  }

  getFieldByName(fieldName: string): IField | null {
    if (fieldName === 'record_score') {
      return new RecordScoreField({ source: this });
    }
    return null;
  }

  showJoinEditor(): boolean {
    // Ignore, only show if joins are enabled for current configuration
    return false;
  }

  getFieldNames(): string[] {
    return ['record_score'];
  }

  async getFields(): Promise<IField[]> {
    return [new RecordScoreField({ source: this })];
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

  renderSourceSettingsEditor(sourceEditorArgs: SourceEditorArgs): React.ReactElement<any> | null {
    return null;
  }

  async supportsFitToBounds(): Promise<boolean> {
    // Return true if you can compute bounds of data
    return true;
  }

  async getLicensedFeatures(): Promise<LICENSED_FEATURES[]> {
    return [LICENSED_FEATURES.ML_ANOMALIES];
  }

  getMaxZoom(): number {
    return MAX_ZOOM;
  }

  getMinZoom(): number {
    return MIN_ZOOM;
  }

  getSourceTooltipContent(sourceDataRequest?: DataRequest): SourceTooltipConfig {
    throw new Error('not implemented');
  }

  async getSupportedShapeTypes(): Promise<VECTOR_SHAPE_TYPE[]> {
    return [VECTOR_SHAPE_TYPE.POINT];
  }

  getSyncMeta(): VectorSourceSyncMeta | null {
    return null;
  }

  async getTooltipProperties(properties: { [p: string]: any } | null): Promise<ITooltipProperty[]> {
    const tooltipProperties: ITooltipProperty[] = [];
    for (const key in properties) {
      if (key === 'record_score') {
        tooltipProperties.push(new RecordScoreTooltipProperty('Record score', properties[key]));
      }
    }
    return tooltipProperties;
  }

  // This is for type-ahead support in the UX for by-value styling
  async getValueSuggestions(field: IField, query: string): Promise<string[]> {
    return [];
  }

  // -----------------
  // API ML probably can ignore

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

  isFieldAware(): boolean {
    return true;
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
    // IGNORE: This is only relevant if your source is backed by an index-pattern
    return false;
  }

  isRefreshTimerAware(): boolean {
    // Allow force-refresh when user clicks "refresh" button in the global time-picker
    return true;
  }
}
