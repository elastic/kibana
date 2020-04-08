/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import uuid from 'uuid/v4';
import React from 'react';
import { MVTVectorSourceEditor } from './mvt_vector_source_editor';
import { AbstractSource } from '../source';
import { SingleTiledVectorLayer } from '../../tiled_vector_layer';
import {
  GeoJsonWithMeta,
  ITiledSingleLayerVectorSource,
  TiledSingleLayerVectorSourceMeta,
} from '../vector_source';
import { MAX_ZOOM, MIN_ZOOM, MVT_SINGLE_LAYER } from '../../../../common/constants';
import { VECTOR_SHAPE_TYPES } from '../vector_feature_types';
import { IField } from '../../fields/field';
import { registerSource } from '../source_registry';
import { getDataSourceLabel, getUrlLabel } from '../../../../common/i18n_getters';

const sourceTitle = i18n.translate('xpack.maps.source.ems_xyzVectorTitle', {
  defaultMessage: 'Vector Tile Layer',
});

export class MVTSingleLayerVectorSource extends AbstractSource
  implements ITiledSingleLayerVectorSource {
  static type = MVT_SINGLE_LAYER;
  static title = i18n.translate('xpack.maps.source.tiledSingleLayerVectorTitle', {
    defaultMessage: 'Tiled vector',
  });
  static description = i18n.translate('xpack.maps.source.tiledSingleLayerVectorDescription', {
    defaultMessage: 'Tiled vector with url template',
  });

  static icon = 'logoElasticsearch';

  static createDescriptor({ urlTemplate, layerName, minZoom, maxZoom }) {
    return {
      type: MVTSingleLayerVectorSource.type,
      id: uuid(),
      urlTemplate,
      layerName,
      minZoom: Math.max(MIN_ZOOM, minZoom),
      maxZoom: Math.min(MAX_ZOOM, maxZoom),
    };
  }

  renderSourceSettingsEditor({ onChange }) {
    return null;
  }

  createDefaultLayer(options) {
    return new SingleTiledVectorLayer({
      layerDescriptor: SingleTiledVectorLayer.createDescriptor({
        sourceDescriptor: this._descriptor,
        ...options,
      }),
      source: this,
    });
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

  getFieldByName(fieldName: string) {
    return null;
  }

  async getImmutableProperties() {
    return [
      { label: getDataSourceLabel(), value: sourceTitle },
      { label: getUrlLabel(), value: this._descriptor.urlTemplate },
      { label: 'Layer name', value: this._descriptor.layerName },
      { label: 'Min zoom', value: this._descriptor.minZoom },
      { label: 'Max zoom', value: this._descriptor.maxZoom },
    ];
  }

  getDisplayName(): Promise<string> {
    return this._descriptor.layerName;
  }

  async getUrlTemplateWithMeta(): TiledSingleLayerVectorSourceMeta {
    return {
      urlTemplate: this._descriptor.urlTemplate,
      layerName: this._descriptor.layerName,
      minZoom: this._descriptor.minZoom,
      maxZoom: this._descriptor.maxZoom,
    };
  }

  async getSupportedShapeTypes() {
    return [VECTOR_SHAPE_TYPES.POINT, VECTOR_SHAPE_TYPES.LINE, VECTOR_SHAPE_TYPES.POLYGON];
  }

  canFormatFeatureProperties() {
    return false;
  }
}

registerSource({
  ConstructorFunction: MVTSingleLayerVectorSource,
  type: MVT_SINGLE_LAYER,
});

export const mvtVectorSourceWizardConfig = {
  description: i18n.translate('xpack.maps.source.mvtVectorSourceWizard', {
    defaultMessage: 'Vector source wizard',
  }),
  icon: 'grid',
  renderWizard: ({ onPreviewSource, inspectorAdapters }) => {
    const onSourceConfigChange = sourceConfig => {
      const sourceDescriptor = MVTSingleLayerVectorSource.createDescriptor(sourceConfig);
      const source = new MVTSingleLayerVectorSource(sourceDescriptor, inspectorAdapters);
      onPreviewSource(source);
    };
    return <MVTVectorSourceEditor onSourceConfigChange={onSourceConfigChange} />;
  },
  title: sourceTitle,
};
