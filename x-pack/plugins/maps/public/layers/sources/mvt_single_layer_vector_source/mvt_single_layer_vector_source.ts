/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import uuid from 'uuid/v4';
import { AbstractSource, ImmutableSourceProperty } from '../source';
import { GeoJsonWithMeta, ITiledSingleLayerVectorSource } from '../vector_source';
import { MAX_ZOOM, MIN_ZOOM, SOURCE_TYPES } from '../../../../common/constants';
import { VECTOR_SHAPE_TYPES } from '../vector_feature_types';
import { IField } from '../../fields/field';
import { registerSource } from '../source_registry';
import { getDataSourceLabel, getUrlLabel } from '../../../../common/i18n_getters';
import {
  MapExtent,
  TiledSingleLayerVectorSourceDescriptor,
  VectorSourceRequestMeta,
  VectorSourceSyncMeta,
} from '../../../../common/descriptor_types';
import { MVTSingleLayerVectorSourceConfig } from './mvt_single_layer_vector_source_editor';

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
  }: MVTSingleLayerVectorSourceConfig) {
    return {
      type: SOURCE_TYPES.MVT_SINGLE_LAYER,
      id: uuid(),
      urlTemplate,
      layerName,
      minSourceZoom: Math.max(MIN_ZOOM, minSourceZoom),
      maxSourceZoom: Math.min(MAX_ZOOM, maxSourceZoom),
    };
  }

  readonly _descriptor: TiledSingleLayerVectorSourceDescriptor;

  constructor(
    sourceDescriptor: TiledSingleLayerVectorSourceDescriptor,
    inspectorAdapters?: object
  ) {
    super(sourceDescriptor, inspectorAdapters);
    this._descriptor = sourceDescriptor;
  }

  renderSourceSettingsEditor() {
    return null;
  }

  getFieldNames(): string[] {
    return [];
  }

  getGeoJsonWithMeta(
    layerName: 'string',
    searchFilters: unknown[],
    registerCancelCallback: (callback: () => void) => void
  ): Promise<GeoJsonWithMeta> {
    // todo: remove this method
    // This is a consequence of ITiledSingleLayerVectorSource extending IVectorSource.
    throw new Error('Does not implement getGeoJsonWithMeta');
  }

  async getFields(): Promise<IField[]> {
    return [];
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
    return false;
  }

  getMinZoom() {
    return this._descriptor.minSourceZoom;
  }

  getMaxZoom() {
    return this._descriptor.maxSourceZoom;
  }

  getBoundsForFilters(searchFilters: VectorSourceRequestMeta): MapExtent {
    return {
      maxLat: 90,
      maxLon: 180,
      minLat: -90,
      minLon: -180,
    };
  }

  getFieldByName(fieldName: string): IField | null {
    return null;
  }

  getSyncMeta(): VectorSourceSyncMeta {
    return null;
  }

  getApplyGlobalQuery(): boolean {
    return false;
  }
}

registerSource({
  ConstructorFunction: MVTSingleLayerVectorSource,
  type: SOURCE_TYPES.MVT_SINGLE_LAYER,
});
