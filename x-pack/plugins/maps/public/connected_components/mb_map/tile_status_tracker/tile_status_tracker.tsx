/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import { Component } from 'react';
import type { ErrorCause } from '@elastic/elasticsearch/lib/api/types';
import type { AJAXError, Map as MbMap, MapSourceDataEvent } from '@kbn/mapbox-gl';
import type { TileError, TileMetaFeature } from '../../../../common/descriptor_types';
import { SPATIAL_FILTERS_LAYER_ID } from '../../../../common/constants';
import { ILayer } from '../../../classes/layers/layer';
import { isLayerGroup } from '../../../classes/layers/layer_group';
import { isESVectorTileSource } from '../../../classes/sources/es_source';
import { getTileKey as getCenterTileKey } from '../../../classes/util/geo_tile_utils';
import { boundsToExtent } from '../../../classes/util/maplibre_utils';
import { ES_MVT_META_LAYER_NAME } from '../../../classes/util/tile_meta_feature_utils';
import { getErrorCacheTileKey, TileErrorCache } from './tile_error_cache';

interface MbTile {
  // references internal object from mapbox
  aborted?: boolean;
}

interface Tile {
  mbKey: string;
  mbSourceId: string;
  mbTile: MbTile;
}

export interface Props {
  mbMap: MbMap;
  layerList: ILayer[];
  onTileStateChange: (
    layerId: string,
    areTilesLoaded: boolean,
    tileMetaFeatures?: TileMetaFeature[],
    tileErrors?: TileError[]
  ) => void;
}

export class TileStatusTracker extends Component<Props> {
  private _isMounted = false;
  // Tile cache tracks active tile requests
  // 'sourcedataloading' event adds tile request to cache
  // 'sourcedata' and 'error' events remove tile request from cache
  // Tile requests with 'aborted' status are removed from cache when reporting 'areTilesLoaded' status
  private _tileCache: Tile[] = [];
  private _tileErrorCache = new TileErrorCache();
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
    this.props.mbMap.on('moveend', this._onMoveEnd);
  }

  componentDidUpdate() {
    this.props.layerList.forEach((layer) => {
      if (isLayerGroup(layer)) {
        return;
      }

      if (!isESVectorTileSource(layer.getSource())) {
        // clear tile cache when layer is not tiled
        this._tileErrorCache.clearLayer(layer.getId(), this._updateTileStatusForAllLayers);
      }
    });
  }

  componentWillUnmount() {
    this._isMounted = false;
    this.props.mbMap.off('error', this._onError);
    this.props.mbMap.off('sourcedata', this._onSourceData);
    this.props.mbMap.off('sourcedataloading', this._onSourceDataLoading);
    this.props.mbMap.off('moveend', this._onMoveEnd);
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

      this._tileErrorCache.clearTileError(
        layerId,
        getErrorCacheTileKey(e.tile.tileID.canonical),
        this._updateTileStatusForAllLayers
      );

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

  _onError = (e: MapSourceDataEvent & { error: { message: string } | AJAXError }) => {
    if (
      e.sourceId &&
      e.sourceId !== SPATIAL_FILTERS_LAYER_ID &&
      e.tile &&
      (e.source.type === 'vector' || e.source.type === 'raster')
    ) {
      this._removeTileFromCache(e.sourceId, e.tile.tileID.key as unknown as string);

      const targetLayer = this.props.layerList.find((layer) => {
        return layer.ownsMbSourceId(e.sourceId);
      });
      if (!targetLayer) {
        return;
      }

      const layerId = targetLayer.getId();
      const tileKey = getErrorCacheTileKey(e.tile.tileID.canonical);
      const tileError = {
        message: e.error.message,
        tileKey,
      };
      this._tileErrorCache.setTileError(layerId, tileError);

      const ajaxError =
        'body' in e.error && 'statusText' in e.error ? (e.error as AJAXError) : undefined;

      if (!ajaxError || !isESVectorTileSource(targetLayer.getSource())) {
        this._updateTileStatusForAllLayers();
        return;
      }

      ajaxError.body
        .text()
        .then((body) => {
          if (this._tileErrorCache.hasTileError(layerId, tileKey)) {
            const parsedJson = JSON.parse(body) as { error?: ErrorCause };
            if (parsedJson.error && 'type' in parsedJson.error) {
              this._tileErrorCache.setTileError(layerId, {
                ...tileError,
                error: parsedJson.error,
              });
              this._updateTileStatusForAllLayers();
            }
          }
        })
        .catch((processAjaxBodyError) => {
          // ignore errors reading and parsing ajax request body
          // Contents are used to provide better UI messaging and are not required
        });
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

  _onMoveEnd = () => {
    const center = this.props.mbMap.getCenter();
    // Maplibre rounds zoom when 'source.roundZoom' is true and floors zoom when 'source.roundZoom' is false
    // 'source.roundZoom' is true for raster and video layers
    // 'source.roundZoom' is false for vector layers
    // Always floor zoom to keep logic as simple as possible and not have to track center tile by source.
    // We are mainly concerned with showing errors from Elasticsearch vector tile requests (which are vector sources)
    const centerTileKey = getCenterTileKey(
      center.lat,
      center.lng,
      Math.floor(this.props.mbMap.getZoom())
    );
    if (this._prevCenterTileKey !== centerTileKey) {
      this._prevCenterTileKey = centerTileKey;
      if (this._tileErrorCache.hasAny()) {
        this._updateTileStatusForAllLayers();
      }
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

      this.props.onTileStateChange(
        layer.getId(),
        !atLeastOnePendingTile,
        this._getTileMetaFeatures(layer),
        this._tileErrorCache.getInViewTileErrors(
          layer.getId(),
          this.props.mbMap.getZoom(),
          boundsToExtent(this.props.mbMap.getBounds())
        )
      );
    }
  }, 100);

  _getTileMetaFeatures = (layer: ILayer) => {
    return layer.isVisible() && isESVectorTileSource(layer.getSource())
      ? // querySourceFeatures can return duplicated features when features cross tile boundaries.
        // Tile meta will never have duplicated features since by their nature, tile meta is a feature contained within a single tile
        (this.props.mbMap
          .querySourceFeatures(layer.getMbSourceId(), {
            sourceLayer: ES_MVT_META_LAYER_NAME,
          })
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
          .filter((feature: TileMetaFeature | null) => feature !== null) as TileMetaFeature[])
      : undefined;
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
