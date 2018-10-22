/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment } from 'react';
import { TMSSource } from './source';
import { TileLayer } from '../tile_layer';
import {
  EuiFieldText,
  EuiButton
} from '@elastic/eui';

export class KibanaTilemapSource extends  TMSSource {

  static type = 'KIBANA_TILEMAP';

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
    return (<KibanaTilemapEditor previewTilemap={previewTilemap} url={url} />);
  };

  renderDetails() {
    return (
      <Fragment>
        <div>
          <span className="bold">Source: </span><span>Kibana Tilemap Configuration</span>
        </div>
        <div>
          <span className="bold">Type: </span><span>Tile</span>
        </div>
        <div>
          <span className="bold">Id: </span><span>{this._descriptor.id}</span>
        </div>
      </Fragment>
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

class KibanaTilemapEditor extends React.Component {

  constructor() {
    super();
    this.state = {
      tilemapCanPreview: false
    };
  }

  render() {
    return (
      <Fragment>
        <EuiFieldText
          readOnly
          placeholder={this.props.url}
          aria-label="Use aria labels when no actual label is in use"
        />
        <EuiButton
          size="s"
          onClick={() => this.props.previewTilemap(this.props.url)}
        >
          {'Preview tilemap'}
        </EuiButton>
      </Fragment>
    );
  }
}
