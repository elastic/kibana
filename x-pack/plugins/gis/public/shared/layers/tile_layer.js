/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ALayer, LAYER_TYPE } from './layer';
import * as ol from 'openlayers';

export class TileLayer extends ALayer {

  static type = LAYER_TYPE.TILE;

  static createDescriptor(options) {
    const tileLayerDescriptor = super.createDescriptor(options);
    tileLayerDescriptor.type = LAYER_TYPE.TILE;
    return tileLayerDescriptor;
  }

  getCurrentStyle() {
    return null;
  }

  createCorrespondingOLLayer() {
    const tileLayer = new ol.layer.Tile({
      source: new ol.source.XYZ({
        url: this._descriptor.source
      })
    });
    tileLayer.setVisible(this.isVisible());
    return tileLayer;
  }
}
