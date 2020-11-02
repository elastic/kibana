/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AbstractLayer } from '../layer';
import { SOURCE_TYPES } from '../../../../common/constants';
import { VegaSourceDescriptor } from '../../../../common/descriptor_types';
import {
  getVegaCanvas,
} from './vega_mapbox_layer';

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

    if (!source) {
      const mbSourceId = this._getMbSourceId();
      const { canvas: vegaCanvas, bindEvents } = await getVegaCanvas(mbMap, mbSourceId);
      mbMap.addSource(mbSourceId, {
        type: 'canvas',
        canvas: vegaCanvas,
        coordinates: [
          mbMap.getBounds().getNorthWest().toArray(),
          mbMap.getBounds().getNorthEast().toArray(),
          mbMap.getBounds().getSouthEast().toArray(),
          mbMap.getBounds().getSouthWest().toArray(),
        ],
        animate: true,
      });

      mbMap.addLayer({
        id: mbLayerId,
        type: 'raster',
        source: mbSourceId,
      });
      bindEvents();
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
