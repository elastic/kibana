/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ALayer, LAYER_TYPE } from './layer';
import { HeatmapStyle } from './styles/heatmap_style';

export class GeohashGridLayer extends ALayer {

  static type = LAYER_TYPE.GEOHASH_GRID;

  constructor(layerDescriptor) {
    super(layerDescriptor);
  }

  static createDescriptor(options) {
    const heatmapLayerDescriptor = super.createDescriptor(options);
    heatmapLayerDescriptor.type = LAYER_TYPE.GEOHASH_GRID;
    return heatmapLayerDescriptor;
  }

  getDisplayName() {
    return `todo geohash grid layer ${this._descriptor.id}`;
  }

  getSupportedStyles() {
    return [HeatmapStyle];
  }

  getCurrentStyle() {
    //todo: fake, obviously
    return new HeatmapStyle(this._descriptor.style);
  }

}
