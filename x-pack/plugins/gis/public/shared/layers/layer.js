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
    layerDescriptor.temporary = options.temporary || false;
    layerDescriptor.style = options.style || {};
    layerDescriptor.id = Math.random().toString(36).substr(2, 5);
    layerDescriptor.name = options.name || `Layer ${layerDescriptor.id}`;
    return layerDescriptor;
  }
}

