/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Map as MapboxMap, MapSourceDataEvent } from '@kbn/mapbox-gl';
import _ from 'lodash';
import { ILayer } from '../../classes/layers/layer';
import { SPATIAL_FILTERS_LAYER_ID } from '../../../common/constants';

interface MbTile {
  // references internal object from mapbox
  aborted?: boolean;
}

interface Tile {
  mbKey: string;
  mbSourceId: string;
  mbTile: MbTile;
}

export class TileStatusTracker {
  private _tileCache: Tile[];
  private readonly _mbMap: MapboxMap;
  private readonly _updateTileStatus: (layer: ILayer, areTilesLoaded: boolean) => void;
  private readonly _getCurrentLayerList: () => ILayer[];
  private readonly _onSourceDataLoading = (e: MapSourceDataEvent) => {
    if (
      e.sourceId &&
      e.sourceId !== SPATIAL_FILTERS_LAYER_ID &&
      e.dataType === 'source' &&
      e.tile &&
      (e.source.type === 'vector' || e.source.type === 'raster')
    ) {
      const tracked = this._tileCache.find((tile) => {
        return (
          tile.mbKey === (e.tile.tileID.key as unknown as string) && tile.mbSourceId === e.sourceId
        );
      });

      if (!tracked) {
        this._tileCache.push({
          mbKey: e.tile.tileID.key as unknown as string,
          mbSourceId: e.sourceId,
          mbTile: e.tile,
        });
        this._updateTileStatusForAllLayers();
      }
    }
  };

  private readonly _onError = (e: MapSourceDataEvent) => {
    if (
      e.sourceId &&
      e.sourceId !== SPATIAL_FILTERS_LAYER_ID &&
      e.tile &&
      (e.source.type === 'vector' || e.source.type === 'raster')
    ) {
      this._removeTileFromCache(e.sourceId, e.tile.tileID.key as unknown as string);
    }
  };
  private readonly _onSourceData = (e: MapSourceDataEvent) => {
    if (
      e.sourceId &&
      e.sourceId !== SPATIAL_FILTERS_LAYER_ID &&
      e.dataType === 'source' &&
      e.tile &&
      (e.source.type === 'vector' || e.source.type === 'raster')
    ) {
      this._removeTileFromCache(e.sourceId, e.tile.tileID.key as unknown as string);
    }
  };

  constructor({
    mbMap,
    updateTileStatus,
    getCurrentLayerList,
  }: {
    mbMap: MapboxMap;
    updateTileStatus: (layer: ILayer, areTilesLoaded: boolean) => void;
    getCurrentLayerList: () => ILayer[];
  }) {
    this._tileCache = [];
    this._updateTileStatus = updateTileStatus;
    this._getCurrentLayerList = getCurrentLayerList;

    this._mbMap = mbMap;
    this._mbMap.on('sourcedataloading', this._onSourceDataLoading);
    this._mbMap.on('error', this._onError);
    this._mbMap.on('sourcedata', this._onSourceData);
  }

  _updateTileStatusForAllLayers = _.debounce(() => {
    this._tileCache = this._tileCache.filter((tile) => {
      return typeof tile.mbTile.aborted === 'boolean' ? !tile.mbTile.aborted : true;
    });
    const layerList = this._getCurrentLayerList();
    for (let i = 0; i < layerList.length; i++) {
      const layer: ILayer = layerList[i];
      let atLeastOnePendingTile = false;
      for (let j = 0; j < this._tileCache.length; j++) {
        const tile = this._tileCache[j];
        if (layer.ownsMbSourceId(tile.mbSourceId)) {
          atLeastOnePendingTile = true;
          break;
        }
      }
      this._updateTileStatus(layer, !atLeastOnePendingTile);
    }
  }, 100);

  _removeTileFromCache = (mbSourceId: string, mbKey: string) => {
    const trackedIndex = this._tileCache.findIndex((tile) => {
      return tile.mbKey === (mbKey as unknown as string) && tile.mbSourceId === mbSourceId;
    });

    if (trackedIndex >= 0) {
      this._tileCache.splice(trackedIndex, 1);
      this._updateTileStatusForAllLayers();
    }
  };

  destroy() {
    this._mbMap.off('error', this._onError);
    this._mbMap.off('sourcedata', this._onSourceData);
    this._mbMap.off('sourcedataloading', this._onSourceDataLoading);
    this._tileCache.length = 0;
  }
}
