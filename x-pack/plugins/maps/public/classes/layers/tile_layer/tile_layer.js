/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AbstractLayer } from '../layer';
import _ from 'lodash';
import { SOURCE_DATA_REQUEST_ID, LAYER_TYPE, LAYER_STYLE_TYPE } from '../../../../common/constants';
import { TileStyle } from '../../styles/tile/tile_style';

export class TileLayer extends AbstractLayer {
  static type = LAYER_TYPE.TILE;

  static createDescriptor(options, mapColors) {
    const tileLayerDescriptor = super.createDescriptor(options, mapColors);
    tileLayerDescriptor.type = TileLayer.type;
    tileLayerDescriptor.alpha = _.get(options, 'alpha', 1);
    tileLayerDescriptor.style = { type: LAYER_STYLE_TYPE.TILE };
    return tileLayerDescriptor;
  }

  constructor({ source, layerDescriptor }) {
    super({ source, layerDescriptor, style: new TileStyle() });
  }

  async syncData({ startLoading, stopLoading, onLoadError, dataFilters }) {
    const sourceDataRequest = this.getSourceDataRequest();
    if (sourceDataRequest) {
      //data is immmutable
      return;
    }
    const requestToken = Symbol(`layer-source-refresh:${this.getId()} - source`);
    startLoading(SOURCE_DATA_REQUEST_ID, requestToken, dataFilters);
    try {
      const url = await this.getSource().getUrlTemplate();
      stopLoading(SOURCE_DATA_REQUEST_ID, requestToken, { url }, {});
    } catch (error) {
      onLoadError(SOURCE_DATA_REQUEST_ID, requestToken, error.message);
    }
  }

  _getMbLayerId() {
    return this.makeMbLayerId('raster');
  }

  getMbLayerIds() {
    return [this._getMbLayerId()];
  }

  ownsMbLayerId(mbLayerId) {
    return this._getMbLayerId() === mbLayerId;
  }

  ownsMbSourceId(mbSourceId) {
    return this.getId() === mbSourceId;
  }

  syncLayerWithMB(mbMap) {
    const source = mbMap.getSource(this.getId());
    const mbLayerId = this._getMbLayerId();

    if (!source) {
      const sourceDataRequest = this.getSourceDataRequest();
      if (!sourceDataRequest) {
        //this is possible if the layer was invisible at startup.
        //the actions will not perform any data=syncing as an optimization when a layer is invisible
        //when turning the layer back into visible, it's possible the url has not been resovled yet.
        return;
      }

      const tmsSourceData = sourceDataRequest.getData();
      if (!tmsSourceData || !tmsSourceData.url) {
        return;
      }

      const mbSourceId = this._getMbSourceId();
      mbMap.addSource(mbSourceId, {
        type: 'raster',
        tiles: [tmsSourceData.url],
        tileSize: 256,
        scheme: 'xyz',
      });

      mbMap.addLayer({
        id: mbLayerId,
        type: 'raster',
        source: mbSourceId,
        minzoom: this._descriptor.minZoom,
        maxzoom: this._descriptor.maxZoom,
      });
    }

    this._setTileLayerProperties(mbMap, mbLayerId);
  }

  _setTileLayerProperties(mbMap, mbLayerId) {
    this.syncVisibilityWithMb(mbMap, mbLayerId);
    mbMap.setLayerZoomRange(mbLayerId, this._descriptor.minZoom, this._descriptor.maxZoom);
    mbMap.setPaintProperty(mbLayerId, 'raster-opacity', this.getAlpha());
  }

  getLayerTypeIconName() {
    return 'grid';
  }

  isLayerLoading() {
    return false;
  }
}
