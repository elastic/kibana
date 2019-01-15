/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { TMSSource } from '../tms_source';
import { TileLayer } from '../../tile_layer';
import { CreateSourceEditor } from './create_source_editor';
import { EuiText } from '@elastic/eui';

export class KibanaTilemapSource extends  TMSSource {

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

  static renderEditor = ({ dataSourcesMeta, onPreviewSource }) => {
    const { url } = dataSourcesMeta ? dataSourcesMeta.kibana.tilemap : {};
    const previewTilemap = (urlTemplate) => {
      const sourceDescriptor = KibanaTilemapSource.createDescriptor(urlTemplate);
      const source = new KibanaTilemapSource(sourceDescriptor);
      onPreviewSource(source);
    };
    return (<CreateSourceEditor previewTilemap={previewTilemap} url={url} />);
  };

  renderDetails() {
    return (
      <EuiText color="subdued" size="s">
        <p className="gisLayerDetails">
          <strong className="gisLayerDetails__label">Source </strong><span>Kibana Tilemap Configuration</span><br/>
          <strong className="gisLayerDetails__label">Type </strong><span>Tile</span><br/>
          <strong className="gisLayerDetails__label">Id </strong><span>{this._descriptor.id}</span><br/>
        </p>
      </EuiText>
    );
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


  getUrlTemplate() {
    return this._descriptor.url;
  }

  async getDisplayName() {
    return this.getUrlTemplate();
  }
}
