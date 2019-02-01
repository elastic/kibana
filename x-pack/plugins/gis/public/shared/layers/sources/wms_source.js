/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';

import {
  EuiFieldText,
  EuiFormRow,
} from '@elastic/eui';

import { AbstractTMSSource } from './tms_source';
import { TileLayer } from '../tile_layer';

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

  static renderEditor({  onPreviewSource }) {
    const previewWMS = (options) => {
      const sourceDescriptor = WMSSource.createDescriptor(options);
      const source = new WMSSource(sourceDescriptor);
      onPreviewSource(source);
    };
    return (<WMSEditor previewWMS={previewWMS} />);
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


class WMSEditor extends  React.Component {

  constructor() {
    super();
    this.state = {
      serviceUrl: '',
      layers: '',
      styles: ''
    };
  }


  _previewIfPossible() {
    if (this.state.serviceUrl && this.state.layers) {
      //todo: should really debounce this so we don't get a ton of changes during typing
      this.props.previewWMS({
        serviceUrl: this.state.serviceUrl,
        layers: this.state.layers,
        styles: this.state.styles
      });
    }
  }

  async _handleServiceUrlChange(e) {
    await this.setState({
      serviceUrl: e.target.value
    });
    this._previewIfPossible();
  }

  async _handleLayersChange(e) {
    await this.setState({
      layers: e.target.value
    });
    this._previewIfPossible();
  }

  async _handleStylesChange(e) {
    await this.setState({
      styles: e.target.value
    });
    this._previewIfPossible();
  }


  render() {
    return (
      <Fragment>
        <EuiFormRow label="Url">
          <EuiFieldText
            value={this.state.serviceUrl}
            onChange={(e) => this._handleServiceUrlChange(e)}
          />
        </EuiFormRow>
        <EuiFormRow label="Layers" helpText={"use comma separated list of layer names"}>
          <EuiFieldText
            onChange={(e) => this._handleLayersChange(e)}
          />
        </EuiFormRow>
        <EuiFormRow label="Styles" helpText={"use comma separated list of style names"}>
          <EuiFieldText
            onChange={(e) => this._handleStylesChange(e)}
          />
        </EuiFormRow>
      </Fragment>

    );
  }
}
