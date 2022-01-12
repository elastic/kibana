/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import uuid from 'uuid/v4';
import React from 'react';
import { GeoJsonProperties, Geometry, Position } from 'geojson';
import { AbstractSource, ImmutableSourceProperty, SourceEditorArgs } from '../source';
import { BoundsRequestMeta, GeoJsonWithMeta, IMvtVectorSource } from '../vector_source';
import {
  FIELD_ORIGIN,
  MAX_ZOOM,
  MIN_ZOOM,
  SOURCE_TYPES,
  VECTOR_SHAPE_TYPE,
} from '../../../../common/constants';
import { registerSource } from '../source_registry';
import { getDataSourceLabel, getUrlLabel } from '../../../../common/i18n_getters';
import {
  MapExtent,
  MVTFieldDescriptor,
  TiledSingleLayerVectorSourceDescriptor,
} from '../../../../common/descriptor_types';
import { MVTField } from '../../fields/mvt_field';
import { UpdateSourceEditor } from './update_source_editor';
import { ITooltipProperty, TooltipProperty } from '../../tooltips/tooltip_property';
import { Adapters } from '../../../../../../../src/plugins/inspector/common/adapters';

export const sourceTitle = i18n.translate(
  'xpack.maps.source.MVTSingleLayerVectorSource.sourceTitle',
  {
    defaultMessage: 'Vector tiles',
  }
);

export class MVTSingleLayerVectorSource extends AbstractSource implements IMvtVectorSource {
  static createDescriptor({
    urlTemplate,
    layerName,
    minSourceZoom,
    maxSourceZoom,
    fields,
    tooltipProperties,
  }: Partial<TiledSingleLayerVectorSourceDescriptor>) {
    return {
      type: SOURCE_TYPES.MVT_SINGLE_LAYER,
      id: uuid(),
      urlTemplate: urlTemplate ? urlTemplate : '',
      layerName: layerName ? layerName : '',
      minSourceZoom:
        typeof minSourceZoom === 'number' ? Math.max(MIN_ZOOM, minSourceZoom) : MIN_ZOOM,
      maxSourceZoom:
        typeof maxSourceZoom === 'number' ? Math.min(MAX_ZOOM, maxSourceZoom) : MAX_ZOOM,
      fields: fields ? fields : [],
      tooltipProperties: tooltipProperties ? tooltipProperties : [],
    };
  }

  readonly _descriptor: TiledSingleLayerVectorSourceDescriptor;
  readonly _tooltipFields: MVTField[];

  constructor(
    sourceDescriptor: TiledSingleLayerVectorSourceDescriptor,
    inspectorAdapters?: Adapters
  ) {
    super(sourceDescriptor, inspectorAdapters);
    this._descriptor = MVTSingleLayerVectorSource.createDescriptor(sourceDescriptor);

    this._tooltipFields = this._descriptor.tooltipProperties
      .map((fieldName) => {
        return this.getFieldByName(fieldName);
      })
      .filter((f) => f !== null) as MVTField[];
  }

  isMvt() {
    return true;
  }

  async supportsFitToBounds() {
    return false;
  }

  renderSourceSettingsEditor({ onChange }: SourceEditorArgs) {
    return (
      <UpdateSourceEditor onChange={onChange} tooltipFields={this._tooltipFields} source={this} />
    );
  }

  getFieldNames(): string[] {
    return this._descriptor.fields.map((field: MVTFieldDescriptor) => {
      return field.name;
    });
  }

  addFeature(geometry: Geometry | Position[]): Promise<void> {
    throw new Error('Does not implement addFeature');
  }

  deleteFeature(featureId: string): Promise<void> {
    throw new Error('Does not implement deleteFeature');
  }

  getMVTFields(): MVTField[] {
    return this._descriptor.fields.map((field: MVTFieldDescriptor) => {
      return new MVTField({
        fieldName: field.name,
        type: field.type,
        source: this,
        origin: FIELD_ORIGIN.SOURCE,
      });
    });
  }

  getFieldByName(fieldName: string): MVTField | null {
    try {
      return this.createField({ fieldName });
    } catch (e) {
      return null;
    }
  }

  createField({ fieldName }: { fieldName: string }): MVTField {
    const field = this._descriptor.fields.find((f: MVTFieldDescriptor) => {
      return f.name === fieldName;
    });
    if (!field) {
      throw new Error(`Cannot create field for fieldName ${fieldName}`);
    }
    return new MVTField({
      fieldName: field.name,
      type: field.type,
      source: this,
      origin: FIELD_ORIGIN.SOURCE,
    });
  }

  getGeoJsonWithMeta(): Promise<GeoJsonWithMeta> {
    // Having this method here is a consequence of IMvtVectorSource extending IVectorSource.
    throw new Error('Does not implement getGeoJsonWithMeta');
  }

  async getFields(): Promise<MVTField[]> {
    return this.getMVTFields();
  }

  getTileSourceLayer(): string {
    return this._descriptor.layerName;
  }

  async getImmutableProperties(): Promise<ImmutableSourceProperty[]> {
    return [
      { label: getDataSourceLabel(), value: sourceTitle },
      { label: getUrlLabel(), value: this._descriptor.urlTemplate },
    ];
  }

  async getDisplayName(): Promise<string> {
    return this.getTileSourceLayer();
  }

  async getTileUrl(): Promise<string> {
    return this._descriptor.urlTemplate;
  }

  async getSupportedShapeTypes(): Promise<VECTOR_SHAPE_TYPE[]> {
    return [VECTOR_SHAPE_TYPE.POINT, VECTOR_SHAPE_TYPE.LINE, VECTOR_SHAPE_TYPE.POLYGON];
  }

  hasTooltipProperties(): boolean {
    return !!this._tooltipFields.length;
  }

  getMinZoom(): number {
    return this._descriptor.minSourceZoom;
  }

  getMaxZoom(): number {
    return this._descriptor.maxSourceZoom;
  }

  async getBoundsForFilters(
    boundsFilters: BoundsRequestMeta,
    registerCancelCallback: (callback: () => void) => void
  ): Promise<MapExtent | null> {
    return null;
  }

  getSyncMeta(): null {
    return null;
  }

  isBoundsAware() {
    return false;
  }

  getSourceStatus() {
    return { tooltipContent: null, areResultsTrimmed: false };
  }

  async getLeftJoinFields() {
    return [];
  }

  async getTooltipProperties(
    properties: GeoJsonProperties,
    featureId?: string | number
  ): Promise<ITooltipProperty[]> {
    const tooltips = [];
    for (const key in properties) {
      if (properties.hasOwnProperty(key)) {
        for (let i = 0; i < this._tooltipFields.length; i++) {
          const mvtField = this._tooltipFields[i];
          if (mvtField.getName() === key) {
            const tooltip = new TooltipProperty(key, key, properties[key]);
            tooltips.push(tooltip);
            break;
          }
        }
      }
    }
    return tooltips;
  }

  async getTimesliceMaskFieldName() {
    return null;
  }

  async supportsFeatureEditing(): Promise<boolean> {
    return false;
  }

  async getDefaultFields(): Promise<Record<string, Record<string, string>>> {
    return {};
  }

  showJoinEditor(): boolean {
    return false;
  }

  getJoinsDisabledReason(): string | null {
    return null;
  }
}

registerSource({
  ConstructorFunction: MVTSingleLayerVectorSource,
  type: SOURCE_TYPES.MVT_SINGLE_LAYER,
});
