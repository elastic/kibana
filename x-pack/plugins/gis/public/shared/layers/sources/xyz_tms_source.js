/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';

import {
  EuiFieldText,
  EuiText,
} from '@elastic/eui';

import { TMSSource } from './source';
import { TileLayer } from '../tile_layer';

export class XYZTMSSource extends TMSSource {

  static type = 'EMS_XYZ';

  static typeDisplayName = 'TMS XYZ';

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

  renderDetails() {
    return (
      <EuiText className="gisLayerDetails" color="subdued" size="s">
        <p>
          <strong className="gisLayerDetails__label">Type: </strong> &emsp; <span>Tile</span><br/>
          <strong className="gisLayerDetails__label">Url: </strong> &emsp;
          <span className="eui-textBreakAll">{this._descriptor.urlTemplate}</span><br/>
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
      <Fragment>
        <EuiFieldText
          placeholder="https://a.tile.openstreetmap.org/{z}/{x}/{y}.png"
          onChange={(e) => this._handleTMSInputChange(e)}
          aria-label="Use aria labels when no actual label is in use"
        />
      </Fragment>
    );
  }
}
