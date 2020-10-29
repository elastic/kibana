/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AbstractLayer } from '../layer';
import { SOURCE_TYPES } from '../../../../common/constants';
import { VegaSourceDescriptor } from '../../../../common/descriptor_types';
import {createMapboxLayer, getCanvas} from "./vega_mapbox_layer";

export class VegaLayer extends AbstractLayer {
  static type = SOURCE_TYPES.VEGA;

  static createDescriptor(options): VegaSourceDescriptor {
    return {
      ...options,
      type: VegaLayer.type,
      name: 'vega-ish',
      id: 'test vega',
    };
  }

  constructor({ source, layerDescriptor }) {
    super({ source, layerDescriptor });
  }

  async syncData({ startLoading, stopLoading, onLoadError, dataFilters }) {
    console.log('vega layer data sync not implemented');
  }

  _getVegaLayerId() {
    return this.makeMbLayerId('vega');
  }

  async syncLayerWithMB(mbMap) {
    const source = mbMap.getSource(this.getId());
    const mbLayerId = this._getVegaLayerId();

    const testCanvas = getCanvas();
    //
    // // Test code
    // var ctx = testCanvas.getContext("2d");
    // ctx.font = "30px Arial";
    // ctx.fillText("Hello World", 10, 50);


    if (!source) {
      const newVegaLayer = await createMapboxLayer(mbMap, mbLayerId);
      mbMap.addSource('canvas-source', {
        type: 'canvas',
        canvas: newVegaLayer,
        coordinates: [
          [-180, 80],
          [180, 80],
          [180, -80],
          [-180, -80],
        ],
      });

      mbMap.addLayer({
        id: 'canvas-layer',
        type: 'raster',
        source: 'canvas-source',
      });
    }
  }

  getLayerTypeIconName() {
    return 'grid';
  }

  isLayerLoading() {
    return false;
  }

  ownsMbLayerId(mbLayerId) {
    return mbLayerId.startsWith(this.getId());
  }
}
