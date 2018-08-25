/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment } from 'react';
import { ASource } from './source';
import { TileLayer } from '../tile_layer';

export class EMSTMSSource extends ASource {

  static type = 'EMS_TMS';

  static createDescriptor(serviceId) {
    return {
      type: EMSTMSSource.type,
      id: serviceId
    };
  }

  renderDetails() {
    return (
      <Fragment>
        <div>
          <span className="bold">Source: </span><span>Elastic Maps Service</span>
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

  _getTMSOptions(allServices) {
    return allServices.find(service => {
      return service.id === this._descriptor.id;
    });
  }

  async createDefaultLayerDescriptor(options, dataSourceMeta = {}) {
    const service = this._getTMSOptions(dataSourceMeta.ems.tms);
    return TileLayer.createDescriptor({
      source: service.url,
      sourceDescriptor: this._descriptor,
      name: this._descriptor.id,
      ...options
    });
  }


}
