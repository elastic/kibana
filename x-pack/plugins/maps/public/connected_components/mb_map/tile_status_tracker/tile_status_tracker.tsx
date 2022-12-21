/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import { Component } from 'react';
import type { Map as MbMap, MapSourceDataEvent } from '@kbn/mapbox-gl';
import { i18n } from '@kbn/i18n';
import { TileMetaFeature } from '../../../../common/descriptor_types';
import { SPATIAL_FILTERS_LAYER_ID } from '../../../../common/constants';
import { ILayer } from '../../../classes/layers/layer';
import { IVectorSource } from '../../../classes/sources/vector_source';
import { getTileKey } from '../../../classes/util/geo_tile_utils';
import { ES_MVT_META_LAYER_NAME } from '../../../classes/util/tile_meta_feature_utils';

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

export interface Props {
  mbMap: MbMap;
  layerList: ILayer[];
  setAreTilesLoaded: (layerId: string, areTilesLoaded: boolean) => void;
  updateMetaFromTiles: (layerId: string, features: TileMetaFeature[]) => void;
  clearTileLoadError: (layerId: string) => void;
  setTileLoadError: (layerId: string, errorMessage: string) => void;
}

export class TileStatusTracker extends Component<Props> {
  private _isMounted = false;
  // Tile cache tracks active tile requests
  // 'sourcedataloading' event adds tile request to cache
  // 'sourcedata' and 'error' events remove tile request from cache
  // Tile requests with 'aborted' status are removed from cache when reporting 'areTilesLoaded' status
  private _tileCache: Tile[] = [];
  // Tile error cache tracks tile request errors per layer
  // Error cache is cleared when map center tile changes
  private _tileErrorCache: Record<string, TileError[]> = {};
  // Layer cache tracks layers that have requested one or more tiles
  // Layer cache is used so that only a layer that has requested one or more tiles reports 'areTilesLoaded' status
  // layer cache is never cleared
  private _layerCache: Map<string, boolean> = new Map<string, boolean>();
  private _prevCenterTileKey?: string;

  componentDidMount() {
    this._isMounted = true;
    this.props.mbMap.on('sourcedataloading', this._onSourceDataLoading);
    this.props.mbMap.on('error', this._onError);
    this.props.mbMap.on('sourcedata', this._onSourceData);
    this.props.mbMap.on('move', this._onMove);
  }

  componentWillUnmount() {
    this._isMounted = false;
    this.props.mbMap.off('error', this._onError);
    this.props.mbMap.off('sourcedata', this._onSourceData);
    this.props.mbMap.off('sourcedataloading', this._onSourceDataLoading);
    this.props.mbMap.off('move', this._onMove);
    this._tileCache.length = 0;
  }

  _onSourceDataLoading = (e: MapSourceDataEvent) => {
    if (
      e.sourceId &&
      e.sourceId !== SPATIAL_FILTERS_LAYER_ID &&
      e.dataType === 'source' &&
      e.tile &&
      (e.source.type === 'vector' || e.source.type === 'raster')
    ) {
      const targetLayer = this.props.layerList.find((layer) => {
        return layer.ownsMbSourceId(e.sourceId);
      });
      const layerId = targetLayer ? targetLayer.getId() : undefined;
      if (layerId && !this._layerCache.has(layerId)) {
        this._layerCache.set(layerId, true);
      }

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

  _onError = (e: MapSourceDataEvent & { error: Error & { status: number } }) => {
    if (
      e.sourceId &&
      e.sourceId !== SPATIAL_FILTERS_LAYER_ID &&
      e.tile &&
      (e.source.type === 'vector' || e.source.type === 'raster')
    ) {
      const targetLayer = this.props.layerList.find((layer) => {
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

  _onSourceData = (e: MapSourceDataEvent) => {
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
  _onMove = () => {
    const center = this.props.mbMap.getCenter();
    // Maplibre rounds zoom when 'source.roundZoom' is true and floors zoom when 'source.roundZoom' is false
    // 'source.roundZoom' is true for raster and video layers
    // 'source.roundZoom' is false for vector layers
    // Always floor zoom to keep logic as simple as possible and not have to track center tile by source.
    // We are mainly concerned with showing errors from Elasticsearch vector tile requests (which are vector sources)
    const centerTileKey = getTileKey(
      center.lat,
      center.lng,
      Math.floor(this.props.mbMap.getZoom())
    );
    if (this._prevCenterTileKey !== centerTileKey) {
      this._prevCenterTileKey = centerTileKey;
      this._tileErrorCache = {};
    }
  };

  _updateTileStatusForAllLayers = _.debounce(() => {
    if (!this._isMounted) {
      return;
    }

    this._tileCache = this._tileCache.filter((tile) => {
      return typeof tile.mbTile.aborted === 'boolean' ? !tile.mbTile.aborted : true;
    });
    const layerList = this.props.layerList;
    for (let i = 0; i < layerList.length; i++) {
      const layer: ILayer = layerList[i];

      if (!this._layerCache.has(layer.getId())) {
        // do not report status for layers that have not started loading tiles.
        continue;
      }

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
      this._updateTileStatusForLayer(
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

  _updateTileStatusForLayer = (layer: ILayer, areTilesLoaded: boolean, errorMessage?: string) => {
    this.props.setAreTilesLoaded(layer.getId(), areTilesLoaded);

    if (errorMessage) {
      this.props.setTileLoadError(layer.getId(), errorMessage);
    } else {
      this.props.clearTileLoadError(layer.getId());
    }

    const source = layer.getSource();
    if (
      layer.isVisible() &&
      source.isESSource() &&
      typeof (source as IVectorSource).isMvt === 'function' &&
      (source as IVectorSource).isMvt()
    ) {
      // querySourceFeatures can return duplicated features when features cross tile boundaries.
      // Tile meta will never have duplicated features since by their nature, tile meta is a feature contained within a single tile
      const mbFeatures = this.props.mbMap.querySourceFeatures(layer.getMbSourceId(), {
        sourceLayer: ES_MVT_META_LAYER_NAME,
        filter: [],
      });

      const features = mbFeatures
        .map((mbFeature) => {
          try {
            return {
              type: 'Feature',
              id: mbFeature?.id,
              geometry: mbFeature?.geometry, // this getter might throw with non-conforming geometries
              properties: mbFeature?.properties,
            } as TileMetaFeature;
          } catch (e) {
            return null;
          }
        })
        .filter((mbFeature: TileMetaFeature | null) => mbFeature !== null) as TileMetaFeature[];
      this.props.updateMetaFromTiles(layer.getId(), features);
    }
  };

  _removeTileFromCache = (mbSourceId: string, mbKey: string) => {
    const trackedIndex = this._tileCache.findIndex((tile) => {
      return tile.mbKey === (mbKey as unknown as string) && tile.mbSourceId === mbSourceId;
    });

    if (trackedIndex >= 0) {
      this._tileCache.splice(trackedIndex, 1);
      this._updateTileStatusForAllLayers();
    }
  };

  render() {
    return null;
  }
}
