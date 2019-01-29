/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { AbstractTMSSource } from '../tms_source';
import { TileLayer } from '../../tile_layer';
import { CreateSourceEditor } from './create_source_editor';
export class KibanaTilemapSource extends  AbstractTMSSource {

  static type = 'KIBANA_TILEMAP';
  static title = 'Custom Tile Map Service';
  static description = 'Map tiles configured in kibana.yml';
  static icon = 'logoKibana';

  static createDescriptor(url) {
    return {
      type: KibanaTilemapSource.type,
      url
    };
  }

  static renderEditor = ({ onPreviewSource }) => {
    const previewTilemap = (urlTemplate) => {
      const sourceDescriptor = KibanaTilemapSource.createDescriptor(urlTemplate);
      const source = new KibanaTilemapSource(sourceDescriptor);
      onPreviewSource(source);
    };
    return (<CreateSourceEditor previewTilemap={previewTilemap}  />);
  };

  async getImmutableProperties() {
    return [
      { label: 'Data source', value: KibanaTilemapSource.title },
      { label: 'Tilemap url', value: (await this.getUrlTemplate()) },
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


  async getUrlTemplate() {
    return this._descriptor.url;
  }

  async getDisplayName() {
    return await this.getUrlTemplate();
  }
}
