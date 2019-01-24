/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { ALayer } from './layer';
import React from 'react';
import { EuiIcon } from '@elastic/eui';
import { TileStyle } from '../layers/styles/tile_style';

export class TileLayer extends ALayer {

  static type = "TILE";
  TMS_LOAD_TIMEOUT = 32000;

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
        tile.request.onloadend = ({ loaded }) => loaded && (tileLoad = true);
      }
    });

    return new Promise((resolve, reject) => {
      let tileLoadTimer = null;
      let checkInterval = null;

      const clearChecks = () => {
        clearInterval(checkInterval);
        clearTimeout(tileLoadTimer);
        map.off('dataloading');
      };

      checkInterval = setInterval(() => {
        if (tileLoad) {
          resolve();
          clearChecks();
        }
      }, 1000);
      tileLoadTimer = setTimeout(() => {
        if (!tileLoad) {
          try {
            throw new Error(`Tiles from "${url}" could not be loaded`);
          } catch (e) {
            reject(e);
          }
        } else {
          resolve();
        }
        clearChecks();
      }, this.TMS_LOAD_TIMEOUT);
    });
  }

  async syncLayerWithMB(mbMap) {
    const source = mbMap.getSource(this.getId());
    const layerId = this.getId() + '_raster';

    if (source) {
      return;
    }

    let url;
    return new Promise((resolve, reject) => {
      try {
        url = this._source.getUrlTemplate();
      } catch (e) {
        reject(e);
      }

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
      resolve();
    }).then(() => this._tileLoadErrorTracker(mbMap, url)
    ).then(() => {
      mbMap.setLayoutProperty(layerId, 'visibility', this.isVisible()
        ? 'visible'
        : 'none');
      mbMap.setLayerZoomRange(layerId, this._descriptor.minZoom,
        this._descriptor.maxZoom);
      this._style && this._style.setMBPaintProperties({
        alpha: this.getAlpha(),
        mbMap,
        layerId,
      });
    });
  }

  getIcon() {
    return (
      <EuiIcon
        type={'grid'}
      />
    );
  }
  isLayerLoading() {
    return false;
  }

}
