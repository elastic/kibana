/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { AbstractTMSSource } from '../tms_source';
import { TileLayer } from '../../tile_layer';
import { WMSCreateSourceEditor } from './wms_create_source_editor';

export class WMSSource extends AbstractTMSSource {

  static type = 'WMS';
  static title = 'Web Map Service';
  static description = 'Maps from OGC Standard WMS';
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
    const previewWMS = (options) => {
      const sourceDescriptor = WMSSource.createDescriptor(options);
      const source = new WMSSource(sourceDescriptor, inspectorAdapters);
      onPreviewSource(source);
    };
    return (<WMSCreateSourceEditor previewWMS={previewWMS} />);
  }

  async getImmutableProperties() {
    return [
      { label: 'Data source', value: WMSSource.title },
      { label: 'Url', value: this._descriptor.serviceUrl },
      { label: 'Layers', value: this._descriptor.layers },
      { label: 'Styles', value: this._descriptor.styles },
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
    console.warn('should compose url using url formatter, not string formatting');
    const styles = this._descriptor.styles ? this._descriptor.styles : '';
    // eslint-disable-next-line max-len
    return `${this._descriptor.serviceUrl}?bbox={bbox-epsg-3857}&format=image/png&service=WMS&version=1.1.1&request=GetMap&srs=EPSG:3857&transparent=true&width=256&height=256&layers=${this._descriptor.layers}&styles=${styles}`;
  }
}
