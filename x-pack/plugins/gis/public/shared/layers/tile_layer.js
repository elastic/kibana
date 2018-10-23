/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ALayer } from './layer';

export class TileLayer extends ALayer {

  static type = "TILE";

  static createDescriptor(options) {
    const tileLayerDescriptor = super.createDescriptor(options);
    tileLayerDescriptor.type = TileLayer.type;
    return tileLayerDescriptor;
  }


  syncLayerWithMB(mbMap) {

    const source = mbMap.getSource(this.getId());
    const layerId = this.getId() + '_raster';
    if (!source) {
      const url = this._source.getUrlTemplate();
      mbMap.addSource(this.getId(), {
        type: 'raster',
        tiles: [url],
        tileSize: 256,
        scheme: 'xyz',
      });

      mbMap.addLayer({
        id: layerId,
        type: 'raster',
        source: this.getId(),
        minzoom: 0,
        maxzoom: 22,
      });
    }

    mbMap.setLayoutProperty(layerId, 'visibility', this.isVisible() ? 'visible' : 'none');
    if (!this._descriptor.showAtAllZoomLevels) {
      mbMap.setLayerZoomRange(layerId, this._descriptor.minZoom, this._descriptor.maxZoom);
    }

  }

}
