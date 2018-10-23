/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { TMSSource } from './source';
import { TileLayer } from '../tile_layer';
import { EuiText } from '@elastic/eui';

export class EMSTMSSource extends TMSSource {

  static type = 'EMS_TMS';

  static typeDisplayName = 'TMS';

  static createDescriptor(serviceId) {
    return {
      type: EMSTMSSource.type,
      id: serviceId
    };
  }

  constructor(descriptor, emsTileServices) {
    super(descriptor);
    this._emsTileServices = emsTileServices;
  }

  renderDetails() {
    return (
      <EuiText color="subdued" size="s">
        <p className="gisLayerDetails">
          <strong className="gisLayerDetails__label">Source: </strong><span>Elastic Maps Service</span><br/>
          <strong className="gisLayerDetails__label">Type: </strong><span>Tile</span><br/>
          <strong className="gisLayerDetails__label">Id: </strong><span>{this._descriptor.id}</span><br/>
        </p>
      </EuiText>
    );
  }

  _getTMSOptions() {
    return this._emsTileServices.find(service => {
      return service.id === this._descriptor.id;
    });
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
    return this._descriptor.id;
  }

  getUrlTemplate() {
    const service = this._getTMSOptions();
    return service.url;
  }


}
