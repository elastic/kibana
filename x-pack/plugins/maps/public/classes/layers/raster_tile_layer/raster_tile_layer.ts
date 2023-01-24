/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Map as MbMap, RasterTileSource } from '@kbn/mapbox-gl';
import { ReactElement } from 'react';
import _ from 'lodash';
import { AbstractLayer } from '../layer';
import { SOURCE_DATA_REQUEST_ID, LAYER_TYPE, LAYER_STYLE_TYPE } from '../../../../common/constants';
import { LayerDescriptor } from '../../../../common/descriptor_types';
import { TileStyle } from '../../styles/tile/tile_style';
import { DataRequestContext } from '../../../actions';

import { IRasterSource, RasterTileSourceData } from '../../sources/raster_source';

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
    source: IRasterSource;
    layerDescriptor: LayerDescriptor;
  }) {
    super({ source, layerDescriptor });
    this._style = new TileStyle();
  }

  getSource(): IRasterSource {
    return super.getSource() as IRasterSource;
  }

  async hasLegendDetails(): Promise<boolean> {
    const source = this.getSource();
    return await source.hasLegendDetails();
  }

  renderLegendDetails(): ReactElement<any> | null {
    const dataRequest = this.getSourceDataRequest();
    const source = this.getSource();
    return source.renderLegendDetails(dataRequest);
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
    const source = this.getSource();
    const nextMeta = {
      ...dataFilters,
      applyGlobalTime: source.getApplyGlobalTime(),
    };
    const prevDataRequest = this.getSourceDataRequest();
    if (prevDataRequest) {
      const canSkip = await source.canSkipSourceUpdate(prevDataRequest, nextMeta);
      if (canSkip) return;
    }
    const requestToken = Symbol(`layer-source-refresh:${this.getId()} - source`);
    try {
      startLoading(SOURCE_DATA_REQUEST_ID, requestToken, nextMeta);
      const data: RasterTileSourceData = {
        url: await source.getUrlTemplate(dataFilters),
      };
      stopLoading(SOURCE_DATA_REQUEST_ID, requestToken, data, {});
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

  _requiresPrevSourceCleanup(mbMap: MbMap): boolean {
    const source = this.getSource();
    const mbSource = mbMap.getSource(this.getMbSourceId()) as RasterTileSource;
    if (!mbSource) {
      return false;
    }

    const sourceDataRequest = this.getSourceDataRequest();
    if (sourceDataRequest) {
      const data = sourceDataRequest.getData();
      if (data) {
        return source.isSourceStale(mbSource, data as RasterTileSourceData);
      }
    }
    return false;
  }

  syncLayerWithMB(mbMap: MbMap) {
    this._removeStaleMbSourcesAndLayers(mbMap);
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

      const tmsSourceData = sourceDataRequest.getData() as RasterTileSourceData;
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

  async isFilteredByGlobalTime(): Promise<boolean> {
    return this.getSource().getApplyGlobalTime() && (await this.getSource().isTimeAware());
  }
}
