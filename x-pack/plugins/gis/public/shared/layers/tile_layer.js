/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AbstractLayer } from './layer';
import _ from 'lodash';
import React from 'react';
import { EuiIcon } from '@elastic/eui';
import { TileStyle } from '../layers/styles/tile_style';

const TMS_LOAD_TIMEOUT = 32000;

export class TileLayer extends AbstractLayer {

  static type = "TILE";

  constructor({ layerDescriptor, source, style }) {
    super({ layerDescriptor, source, style });
    if (!style) {
      this._style = new TileStyle();
    }
  }

  static createDescriptor(options) {
    const tileLayerDescriptor = super.createDescriptor(options);
    tileLayerDescriptor.type = TileLayer.type;
    tileLayerDescriptor.alpha = _.get(options, 'alpha', 1);
    tileLayerDescriptor.style =
      TileStyle.createDescriptor(tileLayerDescriptor.style.properties);
    return tileLayerDescriptor;
  }

  _tileLoadErrorTracker(map, url) {
    let tileLoad;
    map.on('dataloading', ({ tile }) => {
      if (tile && tile.request) {
        // If at least one tile loads, endpoint/resource is valid
        tile.request.onloadend = ({ loaded }) => {
          if (loaded) {
            tileLoad = true;
          }
        };
      }
    });

    return new Promise((resolve, reject) => {
      let tileLoadTimer = null;

      const clearChecks = () => {
        clearTimeout(tileLoadTimer);
        map.off('dataloading');
      };

      tileLoadTimer = setTimeout(() => {
        if (!tileLoad) {
          reject(new Error(`Tiles from "${url}" could not be loaded`));
        } else {
          resolve();
        }
        clearChecks();
      }, TMS_LOAD_TIMEOUT);
    });
  }

  async syncLayerWithMB(mbMap) {
    const source = mbMap.getSource(this.getId());
    const layerId = this.getId() + '_raster';

    if (source) {
      return;
    }

    const url = this._source.getUrlTemplate();
    const sourceId = this.getId();
    mbMap.addSource(sourceId, {
      type: 'raster',
      tiles: [url],
      tileSize: 256,
      scheme: 'xyz',
    });

    mbMap.addLayer({
      id: layerId,
      type: 'raster',
      source: sourceId,
      minzoom: 0,
      maxzoom: 22,
    });

    await this._tileLoadErrorTracker(mbMap, url);

    mbMap.setLayoutProperty(layerId, 'visibility', this.isVisible() ? 'visible' : 'none');
    mbMap.setLayerZoomRange(layerId, this._descriptor.minZoom, this._descriptor.maxZoom);
    this._style && this._style.setMBPaintProperties({
      alpha: this.getAlpha(),
      mbMap,
      layerId,
    });
  }

  getLayerTypeIconName() {
    return 'grid';
  }

  getIcon() {
    return (
      <EuiIcon
        type={this.getLayerTypeIconName()}
      />
    );
  }
  isLayerLoading() {
    return false;
  }

}
