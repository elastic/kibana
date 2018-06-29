/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ALayer, LAYER_TYPE } from './layer';

export class TileLayer extends ALayer {

  constructor() {
    super();
  }

  static create(options) {
    const tileLayerDescriptor = super.create(options);
    tileLayerDescriptor.type = LAYER_TYPE.TILE;
    tileLayerDescriptor.name = options.layerName ||
      `${tileLayerDescriptor.type} Layer - ID: ${tileLayerDescriptor.id}`;
    return tileLayerDescriptor;
  }
}
