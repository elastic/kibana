/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import uuid from 'uuid/v4';
import React from 'react';
import { GeoJsonProperties, Geometry } from 'geojson';
import { FIELD_ORIGIN, MAX_ZOOM, MIN_ZOOM, SOURCE_TYPES } from '../../../../common/constants';
import { GeoJsonWithMeta, ITiledSingleLayerVectorSource } from '../vector_source';
import { VECTOR_SHAPE_TYPES } from '../vector_feature_types';
import { IField } from '../../fields/field';
import { registerSource } from '../source_registry';
import { getDataSourceLabel, getUrlLabel } from '../../../../common/i18n_getters';
import {
  MapExtent,
  MVTFieldDescriptor,
  TiledSingleLayerVectorSourceDescriptor,
  VectorSourceRequestMeta,
  VectorSourceSyncMeta,
} from '../../../../common/descriptor_types';
import { MVTField } from '../../fields/mvt_field';
import { UpdateSourceEditor } from './update_source_editor';
import { ITooltipProperty, TooltipProperty } from '../../tooltips/tooltip_property';
import { AbstractSource, ImmutableSourceProperty } from '../source';

export const sourceTitle = i18n.translate(
  'xpack.maps.source.MVTSingleLayerVectorSource.sourceTitle',
  {
    defaultMessage: 'Vector Tile Layer',
  }
);

export class MVTSingleLayerVectorSource extends AbstractSource
  implements ITiledSingleLayerVectorSource {
  static createDescriptor({
    urlTemplate,
    layerName,
    minSourceZoom,
    maxSourceZoom,
    fields,
    tooltipProperties,
  }: TiledSingleLayerVectorSourceDescriptor) {
    return {
      type: SOURCE_TYPES.MVT_SINGLE_LAYER,
      id: uuid(),
      urlTemplate,
      layerName,
      minSourceZoom: Math.max(MIN_ZOOM, minSourceZoom),
      maxSourceZoom: Math.min(MAX_ZOOM, maxSourceZoom),
      fields: fields ? fields : [],
      tooltipProperties: tooltipProperties ? tooltipProperties : [],
    };
  }

  readonly _descriptor: TiledSingleLayerVectorSourceDescriptor;
  readonly _tooltipFields: MVTField[];

  constructor(
    sourceDescriptor: TiledSingleLayerVectorSourceDescriptor,
    inspectorAdapters?: object
  ) {
    super(sourceDescriptor, inspectorAdapters);
    this._descriptor = MVTSingleLayerVectorSource.createDescriptor(sourceDescriptor);
    this._tooltipFields = this._descriptor.tooltipProperties.map(fieldName => {
      return this.createField({ fieldName });
    });
  }

  renderSourceSettingsEditor({ onChange }) {
    return (
      <UpdateSourceEditor onChange={onChange} tooltipFields={this._tooltipFields} source={this} />
    );
  }

  getFieldNames(): string[] {
    return this._descriptor.fields.map((field: MVTFieldDescriptor) => {
      return field.name;
    });
  }

  getFieldByName(fieldName: string): IField | null {
    return this.createField({ fieldName });
  }

  createField({ fieldName }: { fieldName: string }): IField {
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

  getGeoJsonWithMeta(
    layerName: 'string',
    searchFilters: unknown[],
    registerCancelCallback: (callback: () => void) => void
  ): Promise<GeoJsonWithMeta> {
    // Having this method here is a consequence of ITiledSingleLayerVectorSource extending IVectorSource.
    throw new Error('Does not implement getGeoJsonWithMeta');
  }

  async getFields(): Promise<IField[]> {
    return this._descriptor.fields.map((field: MVTFieldDescriptor) => {
      return new MVTField({
        fieldName: field.name,
        type: field.type,
        source: this,
        origin: FIELD_ORIGIN.SOURCE,
      });
    });
  }

  async getImmutableProperties(): Promise<ImmutableSourceProperty[]> {
    return [
      { label: getDataSourceLabel(), value: sourceTitle },
      { label: getUrlLabel(), value: this._descriptor.urlTemplate },
      {
        label: i18n.translate('xpack.maps.source.MVTSingleLayerVectorSource.layerNameMessage', {
          defaultMessage: 'Layer name',
        }),
        value: this._descriptor.layerName,
      },
      {
        label: i18n.translate('xpack.maps.source.MVTSingleLayerVectorSource.minZoomMessage', {
          defaultMessage: 'Min zoom',
        }),
        value: this._descriptor.minSourceZoom.toString(),
      },
      {
        label: i18n.translate('xpack.maps.source.MVTSingleLayerVectorSource.maxZoomMessage', {
          defaultMessage: 'Max zoom',
        }),
        value: this._descriptor.maxSourceZoom.toString(),
      },
      {
        label: i18n.translate('xpack.maps.source.MVTSingleLayerVectorSource.fields', {
          defaultMessage: 'Fields',
        }),
        value: this._descriptor.fields.map(({ name, type }) => `${name}(${type})`).join(', '),
      },
    ];
  }

  async getDisplayName(): Promise<string> {
    return this._descriptor.layerName;
  }

  async getUrlTemplateWithMeta() {
    return {
      urlTemplate: this._descriptor.urlTemplate,
      layerName: this._descriptor.layerName,
      minSourceZoom: this._descriptor.minSourceZoom,
      maxSourceZoom: this._descriptor.maxSourceZoom,
    };
  }

  async getSupportedShapeTypes(): Promise<VECTOR_SHAPE_TYPES[]> {
    return [VECTOR_SHAPE_TYPES.POINT, VECTOR_SHAPE_TYPES.LINE, VECTOR_SHAPE_TYPES.POLYGON];
  }

  canFormatFeatureProperties() {
    return true;
  }

  getMinZoom() {
    return this._descriptor.minSourceZoom;
  }

  getMaxZoom() {
    return this._descriptor.maxSourceZoom;
  }

  getFeatureProperties(
    id: string | number,
    mbProperties: GeoJsonProperties
  ): GeoJsonProperties | null {
    // Just echo the properties back
    return mbProperties;
  }
  getFeatureGeometry(id: string | number, mbProperties: GeoJsonProperties): Geometry | null {
    // Cannot get the raw geometry for a simple tiled service
    return null;
  }

  getBoundsForFilters(searchFilters: VectorSourceRequestMeta): MapExtent {
    return {
      maxLat: 90,
      maxLon: 180,
      minLat: -90,
      minLon: -180,
    };
  }

  getSyncMeta(): VectorSourceSyncMeta {
    return null;
  }

  getApplyGlobalQuery(): boolean {
    return false;
  }

  supportsFieldMeta(): boolean {
    return false;
  }

  async filterAndFormatPropertiesToHtml(
    properties: GeoJsonProperties,
    featureId?: string | number
  ): Promise<ITooltipProperty[]> {
    const tooltips = [];
    for (const key in properties) {
      if (properties.hasOwnProperty(key)) {
        const field = this._tooltipFields.find((mvtField: MVTField) => {
          return mvtField.getName() === key;
        });

        if (field) {
          const tooltip = new TooltipProperty(key, key, properties[key]);
          tooltips.push(tooltip);
        }
      }
    }
    return tooltips;
  }
}

registerSource({
  ConstructorFunction: MVTSingleLayerVectorSource,
  type: SOURCE_TYPES.MVT_SINGLE_LAYER,
});
