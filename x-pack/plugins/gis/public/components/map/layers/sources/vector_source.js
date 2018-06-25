/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ASource } from './source';

export class VectorSource extends ASource {

  constructor() {
    super();
  }

  static async _setService({ service }) {
    const fetchService = await fetch(service.url);
    return fetchService.json();
  }

  static async create(options) {
    const vectorDescriptor = {};
    // Required
    vectorDescriptor.dataOrigin = this._setDataOrigin(options);
    vectorDescriptor.service = await this._setService(options);
    vectorDescriptor.layerName = options.layerName;
    return vectorDescriptor;
  }

  async getGeoJsonFeatureCollection() {
    const files = await this.getAvailableLayers();
    const layer = files.find((file) => {
      return file.name === this._layerName;
    });

    if (!layer) {
      return null;
    }

    if (layer.format) {
      if (
        (layer.format.type && layer.format.type !== 'geojson') ||
        (!layer.format.type && layer.format !== 'geojson')
      ) {
        throw new Error('Only geojson is implemented now');
      }
    }

    const response = await fetch(layer.url);
    return response.json();

  }
}

