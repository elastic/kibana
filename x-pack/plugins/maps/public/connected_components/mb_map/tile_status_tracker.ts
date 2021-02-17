/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Map as MapboxMap, MapDataEvent } from 'mapbox-gl';
import _ from 'lodash';
import { ILayer } from '../../classes/layers/layer';
import { SPATIAL_FILTERS_LAYER_ID } from '../../../common/constants';

interface MbTile {
  // references internal object from mapbox
  aborted?: true;
}

interface Tile {
  mbKey: string;
  mbSourceId: string;
  mbTile: MbTile;
}

export class TileStatusTracker {
  private _tileCache: Tile[] | null;
  private readonly _setAreTilesLoaded: (layerId: string, areTilesLoaded: boolean) => void;
  private readonly _getCurrentLayerList: () => ILayer[];

  constructor({
    mbMap,
    setAreTilesLoaded,
    getCurrentLayerList,
  }: {
    mbMap: MapboxMap;
    setAreTilesLoaded: (layerId: string, areTilesLoaded: boolean) => void;
    getCurrentLayerList: () => ILayer[];
  }) {
    this._tileCache = [];
    this._setAreTilesLoaded = setAreTilesLoaded;
    this._getCurrentLayerList = getCurrentLayerList;

    mbMap.on('sourcedataloading', (e) => {
      if (!this._tileCache) {
        return;
      }

      if (
        e.sourceId &&
        e.sourceId !== SPATIAL_FILTERS_LAYER_ID &&
        e.dataType === 'source' &&
        e.tile
      ) {
        const tracked = this._tileCache.find((tile) => {
          return (
            tile.mbKey === ((e.coord.key as unknown) as string) && tile.mbSourceId === e.sourceId
          );
        });

        if (!tracked) {
          this._tileCache.push({
            mbKey: (e.coord.key as unknown) as string,
            mbSourceId: e.sourceId,
            mbTile: e.tile,
          });
          this._updateTileStatus();
        }
      }
    });

    mbMap.on('error', (e) => {
      if (e.sourceId && e.sourceId !== SPATIAL_FILTERS_LAYER_ID && e.tile) {
        this._removeTileFromCache(e.sourceId, e.tile.tileID.key);
      }
    });

    mbMap.on('sourcedata', (e: MapDataEvent & { sourceId: string }) => {
      if (
        e.sourceId &&
        e.sourceId !== SPATIAL_FILTERS_LAYER_ID &&
        e.dataType === 'source' &&
        e.tile
      ) {
        this._removeTileFromCache(e.sourceId, (e.coord.key as unknown) as string);
      }
    });
  }

  _updateTileStatus = _.debounce(() => {
    if (!this._tileCache) {
      return;
    }

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
      this._setAreTilesLoaded(layer.getId(), !atLeastOnePendingTile);
    }
  }, 100);

  _removeTileFromCache = (mbSourceId: string, mbKey: string) => {
    if (!this._tileCache) {
      return;
    }
    const trackedIndex = this._tileCache.findIndex((tile) => {
      return tile.mbKey === ((mbKey as unknown) as string) && tile.mbSourceId === mbSourceId;
    });

    if (trackedIndex >= 0) {
      this._tileCache.splice(trackedIndex, 1);
      this._updateTileStatus();
    }
  };

  destroy() {
    this._tileCache = null;
  }
}
