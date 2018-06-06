/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export class EMSVectorSource {

  constructor(options) {
    this._kbnCoreAPI = options.kbnCoreAPI;
    this._layerName = options.layerName;
  }

  async getGeoJsonFeatureCollection() {

    const files = await this._kbnCoreAPI.serviceSettings.getFileLayers();

    const layer = files.find((file) => {
      return file.name === this._layerName;
    });

    if (layer.format && layer.format !== "geojson") {
      throw new Error('Only geojson is implemented now');
    }

    const response = await fetch(layer.url);
    return response.json();
  }
}
