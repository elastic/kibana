/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ALayer, LAYER_TYPE } from './layer';

export class VectorLayer extends ALayer {

  constructor() {
    super();
  }

  static create(options) {
    const vectorLayerDescriptor = super.create(options);
    vectorLayerDescriptor.type = LAYER_TYPE.VECTOR;
    return vectorLayerDescriptor;
  }

  getType() {
    return "Vector";
  }
}
