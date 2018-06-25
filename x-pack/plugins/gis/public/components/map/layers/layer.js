/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
export const LAYER_TYPE = {
  TILE: 'TILE',
  VECTOR: 'VECTOR'
};

export class ALayer {
  constructor() {}

  static create(options) {
    const layerDescriptor = {};
    layerDescriptor.source = options.source;
    layerDescriptor.visible = options.visible || true;
    layerDescriptor.style = options.style || {};
    return layerDescriptor;
  }
}

