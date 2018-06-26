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

  static create(options) {
    const vectorDescriptor = super.create(options);
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

