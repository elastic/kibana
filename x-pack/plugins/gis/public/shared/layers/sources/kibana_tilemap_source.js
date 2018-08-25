/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment } from 'react';
import { ASource } from './source';
import { TileLayer } from '../tile_layer';
import {
  EuiFieldText,
  EuiButton
} from '@elastic/eui';

export class KibanaTilemapSource extends  ASource {

  static type = 'KIBANA_TILEMAP';

  static createDescriptor(url) {
    return {
      type: KibanaTilemapSource.type,
      url
    };
  }

  static renderEditor = ({ dataSourcesMeta, onPreviewSource }) => {
    const { url } = dataSourcesMeta.kibana.tilemap;
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
          <span className="bold">Type: </span><span>Tile (todo, use icon)</span>
        </div>
        <div>
          <span className="bold">Id: </span><span>{this._descriptor.id}</span>
        </div>
      </Fragment>
    );
  }

  async createDefaultLayerDescriptor(options) {
    return TileLayer.createDescriptor({
      source: this._descriptor.url,
      sourceDescriptor: this._descriptor,
      name: this._descriptor.id,
      ...options
    });
  }
}

class KibanaTilemapEditor extends React.Component {

  constructor() {
    super();
    this.state = {
      tilemapCanPreview: false
    };
  }

  _handleTMSInputChange(e) {
    this.setState({
      tmsInput: e.target.value,
      tmsCanPreview: (e.target.value.indexOf('{x}') >= 0 && e.target.value.indexOf('{y}') >= 0 && e.target.value.indexOf('{z}') >= 0)
    });
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
