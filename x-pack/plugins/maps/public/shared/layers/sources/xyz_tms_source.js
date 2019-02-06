/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import {
  EuiFieldText,
  EuiFormRow,
} from '@elastic/eui';

import { AbstractTMSSource } from './tms_source';
import { TileLayer } from '../tile_layer';

export class XYZTMSSource extends AbstractTMSSource {

  static type = 'EMS_XYZ';
  static title = 'Tile Map Service from URL';
  static description = 'Map tiles from a URL that includes the XYZ coordinates';
  static icon = 'grid';

  static createDescriptor(urlTemplate) {
    return {
      type: XYZTMSSource.type,
      urlTemplate: urlTemplate
    };
  }

  static renderEditor({  onPreviewSource }) {
    const previewTMS = (urlTemplate) => {
      const sourceDescriptor = XYZTMSSource.createDescriptor(urlTemplate);
      const source = new XYZTMSSource(sourceDescriptor);
      onPreviewSource(source);
    };
    return (<XYZTMSEditor previewTMS={previewTMS} />);
  }

  async getImmutableProperties() {
    return [
      { label: 'Data source', value: XYZTMSSource.title },
      { label: 'Url', value: this._descriptor.urlTemplate },
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
    return this._descriptor.urlTemplate;
  }

  getUrlTemplate() {
    return this._descriptor.urlTemplate;
  }
}


class XYZTMSEditor extends  React.Component {

  constructor() {
    super();
    this.state = {
      tmsInput: '',
      tmsCanPreview: false
    };
  }

  _handleTMSInputChange(e) {
    const url = e.target.value;
    const canPreview = (url.indexOf('{x}') >= 0 && url.indexOf('{y}') >= 0 && url.indexOf('{z}') >= 0);
    this.setState({
      tmsInput: url,
      tmsCanPreview: canPreview
    });

    if (canPreview) {
      this.props.previewTMS(url);
    }
  }

  render() {
    return (
      <EuiFormRow label="Url">
        <EuiFieldText
          placeholder="https://a.tile.openstreetmap.org/{z}/{x}/{y}.png"
          onChange={(e) => this._handleTMSInputChange(e)}
        />
      </EuiFormRow>
    );
  }
}
