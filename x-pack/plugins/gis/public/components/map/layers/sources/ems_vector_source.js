/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AVectorSource } from './vector_source';

export class EMSVectorSource extends AVectorSource {

  constructor(options) {
    super(options);
  }

  getDisplayName() {
    return `EMS: ${this._layerName}`;
  }

  async getAvailableLayers() {
    return await this._kbnCoreAPI.serviceSettings.getFileLayers();
  }
}
