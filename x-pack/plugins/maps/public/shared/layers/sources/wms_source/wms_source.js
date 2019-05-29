/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { AbstractTMSSource } from '../tms_source';
import { TileLayer } from '../../tile_layer';
import { WMSCreateSourceEditor } from './wms_create_source_editor';
import { i18n } from '@kbn/i18n';
import { getDataSourceLabel, getUrlLabel } from '../../../../../common/i18n_getters';
import { WmsClient } from './wms_client';

export class WMSSource extends AbstractTMSSource {

  static type = 'WMS';
  static title = i18n.translate('xpack.maps.source.wmsTitle', {
    defaultMessage: 'Web Map Service'
  });
  static description = i18n.translate('xpack.maps.source.wmsDescription', {
    defaultMessage: 'Maps from OGC Standard WMS'
  });
  static icon = 'grid';

  static createDescriptor({ serviceUrl, layers, styles }) {
    return {
      type: WMSSource.type,
      serviceUrl: serviceUrl,
      layers: layers,
      styles: styles
    };
  }

  static renderEditor({  onPreviewSource, inspectorAdapters }) {
    const previewWMS = (sourceConfig) => {
      if (!sourceConfig) {
        onPreviewSource(null);
        return;
      }

      const sourceDescriptor = WMSSource.createDescriptor(sourceConfig);
      const source = new WMSSource(sourceDescriptor, inspectorAdapters);
      onPreviewSource(source);
    };
    return (<WMSCreateSourceEditor previewWMS={previewWMS} />);
  }

  async getImmutableProperties() {
    return [
      { label: getDataSourceLabel(), value: WMSSource.title },
      { label: getUrlLabel(), value: this._descriptor.serviceUrl },
      {
        label: i18n.translate('xpack.maps.source.wms.layersLabel', {
          defaultMessage: 'Layers'
        }),
        value: this._descriptor.layers
      },
      {
        label: i18n.translate('xpack.maps.source.wms.stylesLabel', {
          defaultMessage: 'Styles'
        }),
        value: this._descriptor.styles
      },
    ];
  }

  _createDefaultLayerDescriptor(options) {
    return TileLayer.createDescriptor({
      sourceDescriptor: this._descriptor,
      ...options
    });
  }

  createDefaultLayer(options) {
    return new TileLayer({
      layerDescriptor: this._createDefaultLayerDescriptor(options),
      source: this
    });
  }

  async getDisplayName() {
    return this._descriptor.serviceUrl;
  }

  getUrlTemplate() {
    const client = new WmsClient({ serviceUrl: this._descriptor.serviceUrl });
    return client.getUrlTemplate(this._descriptor.layers, this._descriptor.styles || '');
  }
}
