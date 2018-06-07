/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AVectorSource } from './vector_source';

export class KbnYmlVectorSource extends AVectorSource {

  constructor(options) {
    super(options);
  }

  async getAvailableLayers() {
    return this._kbnCoreAPI.mapConfig.regionmap.layers;
  }


}
