/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment } from 'react';
import { TMSSource } from './tms_source';
import { TileLayer } from '../tile_layer';
import {
  EuiFieldText,
  EuiButton,
  EuiText,
  EuiSpacer
} from '@elastic/eui';

export class KibanaTilemapSource extends  TMSSource {

  static type = 'KIBANA_TILEMAP';
  static typeDisplayName = 'Custom Tile Map Service';

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

  static renderDropdownDisplayOption() {
    return (
      <Fragment>
        <strong>{KibanaTilemapSource.typeDisplayName}</strong>
        <EuiSpacer size="xs" />
        <EuiText size="s" color="subdued">
          <p className="euiTextColor--subdued">
            Map tiles configured in kibana.yml
          </p>
        </EuiText>
      </Fragment>
    );
  }

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
