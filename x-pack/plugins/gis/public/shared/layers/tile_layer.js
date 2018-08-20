/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ALayer, LAYER_TYPE } from './layer';

export class TileLayer extends ALayer {

  static type = LAYER_TYPE.TILE;

  constructor(layerDescriptor) {
    super(layerDescriptor);
  }

  static createDescriptor(options) {
    const tileLayerDescriptor = super.createDescriptor(options);
    tileLayerDescriptor.type = LAYER_TYPE.TILE;
    return tileLayerDescriptor;
  }


}
