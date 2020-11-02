/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AbstractLayer } from '../layer';
import { LAYER_STYLE_TYPE, SOURCE_TYPES } from '../../../../common/constants';
import { VegaSourceDescriptor } from '../../../../common/descriptor_types';
import {
  getVegaCanvas,
} from './vega_mapbox_layer';
import { TileStyle } from '../../styles/tile/tile_style';

export class VegaLayer extends AbstractLayer {
  static type = SOURCE_TYPES.VEGA;

  static createDescriptor(options, mapColors): VegaSourceDescriptor {
    const vegaLayerDescriptor = super.createDescriptor(options, mapColors);
    vegaLayerDescriptor.type = VegaLayer.type;
    vegaLayerDescriptor.alpha = _.get(options, 'alpha', 1);
    // Placeholder
    vegaLayerDescriptor.style = { type: LAYER_STYLE_TYPE.TILE };
    return vegaLayerDescriptor;
  }

  constructor({ source, layerDescriptor }) {
    super({ source, layerDescriptor });
    // Placeholder style
    this._style = new TileStyle();
  }

  getStyleForEditing() {
    return this._style;
  }

  getStyle() {
    return this._style;
  }

  getCurrentStyle() {
    return this._style;
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
