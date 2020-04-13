/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import uuid from 'uuid/v4';
import { ImmutableSourceProperty } from '../source';
import { SingleTiledVectorLayer } from '../../tiled_vector_layer';
import {
  AbstractVectorSource,
  GeoJsonWithMeta,
  ITiledSingleLayerVectorSource,
} from '../vector_source';
import { MAX_ZOOM, MIN_ZOOM, SOURCE_TYPES } from '../../../../common/constants';
import { VECTOR_SHAPE_TYPES } from '../vector_feature_types';
import { IField } from '../../fields/field';
import { registerSource } from '../source_registry';
import { getDataSourceLabel, getUrlLabel } from '../../../../common/i18n_getters';
import {
  LayerDescriptor,
  MapExtent,
  TiledSingleLayerVectorSourceDescriptor,
  VectorSourceRequestMeta,
  VectorSourceSyncMeta,
} from '../../../../common/descriptor_types';
import { VectorLayerArguments } from '../../vector_layer';

export const sourceTitle = i18n.translate('xpack.maps.source.ems_xyzVectorTitle', {
  defaultMessage: 'Vector Tile Layer',
});

export class MVTSingleLayerVectorSource extends AbstractVectorSource
  implements ITiledSingleLayerVectorSource {
  static type = SOURCE_TYPES.MVT_SINGLE_LAYER;
  static title = i18n.translate('xpack.maps.source.tiledSingleLayerVectorTitle', {
    defaultMessage: 'Tiled vector',
  });
  static description = i18n.translate('xpack.maps.source.tiledSingleLayerVectorDescription', {
    defaultMessage: 'Tiled vector with url template',
  });

  static icon = 'logoElasticsearch';

  static createDescriptor({
    urlTemplate,
    layerName,
    minZoom,
    maxZoom,
  }: TiledSingleLayerVectorSourceDescriptor) {
    return {
      type: MVTSingleLayerVectorSource.type,
      id: uuid(),
      urlTemplate,
      layerName,
      minZoom: Math.max(MIN_ZOOM, minZoom),
      maxZoom: Math.min(MAX_ZOOM, maxZoom),
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

  createDefaultLayer(options: LayerDescriptor): SingleTiledVectorLayer {
    const layerDescriptor = {
      sourceDescriptor: this._descriptor,
      ...options,
    };
    const normalizedLayerDescriptor = SingleTiledVectorLayer.createDescriptor(layerDescriptor, []);
    const vectorLayerArguments: VectorLayerArguments = {
      layerDescriptor: normalizedLayerDescriptor,
      source: this,
    };
    return new SingleTiledVectorLayer(vectorLayerArguments);
  }

  getGeoJsonWithMeta(
    layerName: 'string',
    searchFilters: unknown[],
    registerCancelCallback: (callback: () => void) => void
  ): Promise<GeoJsonWithMeta> {
    throw new Error('Does not implement getGeoJsonWithMeta');
  }

  async getFields(): Promise<IField[]> {
    return [];
  }

  async getImmutableProperties(): Promise<ImmutableSourceProperty[]> {
    return [
      { label: getDataSourceLabel(), value: sourceTitle },
      { label: getUrlLabel(), value: this._descriptor.urlTemplate },
      { label: 'Layer name', value: this._descriptor.layerName },
      { label: 'Min zoom', value: this._descriptor.minZoom.toString() },
      { label: 'Max zoom', value: this._descriptor.maxZoom.toString() },
    ];
  }

  async getDisplayName(): Promise<string> {
    return this._descriptor.layerName;
  }

  async getUrlTemplateWithMeta() {
    return {
      urlTemplate: this._descriptor.urlTemplate,
      layerName: this._descriptor.layerName,
      minZoom: this._descriptor.minZoom,
      maxZoom: this._descriptor.maxZoom,
    };
  }

  async getSupportedShapeTypes(): Promise<VECTOR_SHAPE_TYPES[]> {
    return [VECTOR_SHAPE_TYPES.POINT, VECTOR_SHAPE_TYPES.LINE, VECTOR_SHAPE_TYPES.POLYGON];
  }

  canFormatFeatureProperties() {
    return false;
  }

  getMinZoom() {
    return this._descriptor.minZoom;
  }

  getMaxZoom() {
    return this._descriptor.maxZoom;
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
