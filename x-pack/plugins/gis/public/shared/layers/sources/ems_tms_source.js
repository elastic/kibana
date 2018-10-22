/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment } from 'react';
import { TMSSource } from './source';
import { TileLayer } from '../tile_layer';

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
      <Fragment>
        <div>
          <span className="bold">Source: </span><span>Elastic Maps Service</span>
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
