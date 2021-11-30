/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Map as MbMap } from '@kbn/mapbox-gl';
import _ from 'lodash';
import { AbstractLayer } from '../layer';
import { SOURCE_DATA_REQUEST_ID, LAYER_TYPE, LAYER_STYLE_TYPE } from '../../../../common/constants';
import { LayerDescriptor } from '../../../../common/descriptor_types';
import { TileStyle } from '../../styles/tile/tile_style';
import { ITMSSource } from '../../sources/tms_source';
import { DataRequestContext } from '../../../actions';

export class RasterTileLayer extends AbstractLayer {
  static createDescriptor(options: Partial<LayerDescriptor>) {
    const tileLayerDescriptor = super.createDescriptor(options);
    tileLayerDescriptor.type = LAYER_TYPE.RASTER_TILE;
    tileLayerDescriptor.alpha = _.get(options, 'alpha', 1);
    tileLayerDescriptor.style = { type: LAYER_STYLE_TYPE.TILE };
    return tileLayerDescriptor;
  }

  private readonly _style: TileStyle;

  constructor({
    source,
    layerDescriptor,
  }: {
    source: ITMSSource;
    layerDescriptor: LayerDescriptor;
  }) {
    super({ source, layerDescriptor });
    this._style = new TileStyle();
  }

  getSource(): ITMSSource {
    return super.getSource() as ITMSSource;
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

  async syncData({ startLoading, stopLoading, onLoadError, dataFilters }: DataRequestContext) {
    const sourceDataRequest = this.getSourceDataRequest();
    if (sourceDataRequest) {
      // data is immmutable
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

  ownsMbLayerId(mbLayerId: string) {
    return this._getMbLayerId() === mbLayerId;
  }

  ownsMbSourceId(mbSourceId: string) {
    return this.getId() === mbSourceId;
  }

  syncLayerWithMB(mbMap: MbMap) {
    const source = mbMap.getSource(this.getId());
    const mbLayerId = this._getMbLayerId();

    if (!source) {
      const sourceDataRequest = this.getSourceDataRequest();
      if (!sourceDataRequest) {
        // this is possible if the layer was invisible at startup.
        // the actions will not perform any data=syncing as an optimization when a layer is invisible
        // when turning the layer back into visible, it's possible the url has not been resovled yet.
        return;
      }

      const tmsSourceData = sourceDataRequest.getData() as { url?: string };
      if (!tmsSourceData || !tmsSourceData.url) {
        return;
      }

      const mbSourceId = this.getMbSourceId();
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

  _setTileLayerProperties(mbMap: MbMap, mbLayerId: string) {
    this.syncVisibilityWithMb(mbMap, mbLayerId);
    mbMap.setLayerZoomRange(mbLayerId, this.getMinZoom(), this.getMaxZoom());
    mbMap.setPaintProperty(mbLayerId, 'raster-opacity', this.getAlpha());
  }

  getLayerTypeIconName() {
    return 'grid';
  }

  isBasemap(order: number) {
    return order === 0;
  }
}
