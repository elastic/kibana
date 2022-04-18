/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Map as MapboxMap, MapSourceDataEvent } from '@kbn/mapbox-gl';
import _ from 'lodash';
import { i18n } from '@kbn/i18n';
import { ILayer } from '../../classes/layers/layer';
import { SPATIAL_FILTERS_LAYER_ID } from '../../../common/constants';
import { getTileKey } from '../../classes/util/geo_tile_utils';

interface MbTile {
  // references internal object from mapbox
  aborted?: boolean;
}

type TileError = Error & {
  status: number;
  tileZXYKey: string; // format zoom/x/y
};

interface Tile {
  mbKey: string;
  mbSourceId: string;
  mbTile: MbTile;
}

export class TileStatusTracker {
  private _tileCache: Tile[];
  private _tileErrorCache: Record<string, TileError[]>;
  private _prevCenterTileKey?: string;
  private readonly _mbMap: MapboxMap;
  private readonly _updateTileStatus: (
    layer: ILayer,
    areTilesLoaded: boolean,
    errorMessage?: string
  ) => void;
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

  private readonly _onError = (e: MapSourceDataEvent & { error: Error & { status: number } }) => {
    if (
      e.sourceId &&
      e.sourceId !== SPATIAL_FILTERS_LAYER_ID &&
      e.tile &&
      (e.source.type === 'vector' || e.source.type === 'raster')
    ) {
      const targetLayer = this._getCurrentLayerList().find((layer) => {
        return layer.ownsMbSourceId(e.sourceId);
      });
      const layerId = targetLayer ? targetLayer.getId() : undefined;
      if (layerId) {
        const layerErrors = this._tileErrorCache[layerId] ? this._tileErrorCache[layerId] : [];
        layerErrors.push({
          ...e.error,
          tileZXYKey: `${e.tile.tileID.canonical.z}/${e.tile.tileID.canonical.x}/${e.tile.tileID.canonical.y}`,
        } as TileError);
        this._tileErrorCache[layerId] = layerErrors;
      }
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

  /*
   * Clear errors when center tile changes.
   * Tracking center tile provides the cleanest way to know when a new data fetching cycle is beginning
   */
  private readonly _onMove = () => {
    const center = this._mbMap.getCenter();
    // Maplibre rounds zoom when 'source.roundZoom' is true and floors zoom when 'source.roundZoom' is false
    // 'source.roundZoom' is true for raster and video layers
    // 'source.roundZoom' is false for vector layers
    // Always floor zoom to keep logic as simple as possible and not have to track center tile by source.
    // We are mainly concerned with showing errors from Elasticsearch vector tile requests (which are vector sources)
    const centerTileKey = getTileKey(center.lat, center.lng, Math.floor(this._mbMap.getZoom()));
    if (this._prevCenterTileKey !== centerTileKey) {
      this._prevCenterTileKey = centerTileKey;
      this._tileErrorCache = {};
    }
  };

  constructor({
    mbMap,
    updateTileStatus,
    getCurrentLayerList,
  }: {
    mbMap: MapboxMap;
    updateTileStatus: (layer: ILayer, areTilesLoaded: boolean, errorMessage?: string) => void;
    getCurrentLayerList: () => ILayer[];
  }) {
    this._tileCache = [];
    this._tileErrorCache = {};
    this._updateTileStatus = updateTileStatus;
    this._getCurrentLayerList = getCurrentLayerList;

    this._mbMap = mbMap;
    this._mbMap.on('sourcedataloading', this._onSourceDataLoading);
    this._mbMap.on('error', this._onError);
    this._mbMap.on('sourcedata', this._onSourceData);
    this._mbMap.on('move', this._onMove);
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
      const tileErrorMessages = this._tileErrorCache[layer.getId()]
        ? this._tileErrorCache[layer.getId()].map((tileError) => {
            return i18n.translate('xpack.maps.tileStatusTracker.tileErrorMsg', {
              defaultMessage: `tile '{tileZXYKey}' failed to load: '{status} {message}'`,
              values: {
                tileZXYKey: tileError.tileZXYKey,
                status: tileError.status,
                message: tileError.message,
              },
            });
          })
        : [];
      this._updateTileStatus(
        layer,
        !atLeastOnePendingTile,
        tileErrorMessages.length
          ? i18n.translate('xpack.maps.tileStatusTracker.layerErrorMsg', {
              defaultMessage: `Unable to load {count} tiles: {tileErrors}`,
              values: {
                count: tileErrorMessages.length,
                tileErrors: tileErrorMessages.join(', '),
              },
            })
          : undefined
      );
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
    this._mbMap.off('move', this._onMove);
    this._tileCache.length = 0;
  }
}
