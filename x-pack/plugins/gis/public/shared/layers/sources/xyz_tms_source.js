/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';

import {
  EuiFieldText,
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
      <Fragment>
        <div>
          <span className="bold">Type: </span><span>Tile</span>
        </div>
        <div>
          <span className="bold">Url: </span><span>{this._descriptor.urlTemplate}</span>
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
