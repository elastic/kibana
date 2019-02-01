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

  async syncData({ startLoading, stopLoading, onLoadError, dataFilters }) {
    if (!this.isVisible() || !this.showAtZoomLevel(dataFilters.zoom)) {
      return;
    }
    const sourceDataId = 'source';
    const requestToken = Symbol(`layer-source-refresh:${ this.getId()} - source`);
    startLoading(sourceDataId, requestToken, dataFilters);
    try {
      const url = await this._source.getUrlTemplate();
      stopLoading(sourceDataId, requestToken, url, {});
    } catch(error) {
      onLoadError(sourceDataId, requestToken, error.message);
    }
  }

  async syncLayerWithMB(mbMap) {

    const source = mbMap.getSource(this.getId());
    const mbLayerId = this.getId() + '_raster';

    if (source) {
      // If source exists, just sync style
      this._setTileLayerProperties(mbMap, mbLayerId);
      return;
    }

    const sourceDataRquest = this.getSourceDataRequest();
    const url = sourceDataRquest.getData();
    if (!url) {
      return;
    }

    const sourceId = this.getId();
    mbMap.addSource(sourceId, {
      type: 'raster',
      tiles: [url],
      tileSize: 256,
      scheme: 'xyz',
    });

    mbMap.addLayer({
      id: mbLayerId,
      type: 'raster',
      source: sourceId,
      minzoom: this._descriptor.minZoom,
      maxzoom: this._descriptor.maxZoom,
    });
    this._setTileLayerProperties(mbMap, mbLayerId);

    await this._tileLoadErrorTracker(mbMap, url);
  }

  _setTileLayerProperties(mbMap, mbLayerId) {
    mbMap.setLayoutProperty(mbLayerId, 'visibility', this.isVisible() ? 'visible' : 'none');
    mbMap.setLayerZoomRange(mbLayerId, this._descriptor.minZoom, this._descriptor.maxZoom);
    this._style && this._style.setMBPaintProperties({
      alpha: this.getAlpha(),
      mbMap,
      layerId: mbLayerId,
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
