/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LAT_INDEX, LON_INDEX } from '../../../common/constants';
import { EventEmitter } from 'events';
import { TileRequest } from './types';
import { isPointInTile } from '../../classes/util/geo_tile_utils';

export class VectorTileAdapter extends EventEmitter {
  private _layers: Record<string, { label: string; tileUrl: string }> = {};
  private _tiles: Array<{ x: number; y: number; z: number }> = [];
  private _layerTileMetaFeatures: Record<string, TileMetaFeature[]> = {};

  public addLayer(layerId: string, label: string, tileUrl: string) {
    this._layers[layerId] = { label, tileUrl };
    this._onChange();
  }

  public removeLayer(layerId: string) {
    delete this._layers[layerId];
    this._onChange();
  }

  public hasLayers() {
    return Object.keys(this._layers).length > 0;
  }

  public setTiles(tiles: Array<{ x: number; y: number; z: number }>) {
    this._tiles = tiles;
    this._onChange();
  }

  public setTileMetaFeatures(layerId: string, tileMetaFeatures?: TileMetaFeature[]) {
    this._layerTileMetaFeatures[layerId] = tileMetaFeatures ? tileMetaFeatures : [];
    this._onChange();
  }

  public getLayerOptions(): Array<{ value: string; label: string }> {
    return Object.keys(this._layers).map((layerId) => {
      return {
        value: layerId,
        label: this._layers[layerId].label,
      };
    });
  }

  public getTileRequests(layerId: string): TileRequest[] {
    if (!this._layers[layerId]) {
      return [];
    }

    const { tileUrl } = this._layers[layerId];
    return this._tiles.map((tile) => {
      return {
        layerId,
        tileUrl,
        tileMetaFeature: this._getTileMetaFeature(layerId, tile.x, tile.y, tile.z),
        ...tile,
      };
    });
  }

  private _getTileMetaFeature(layerId: string, x: number, y: number, z: number) {
    if (!this._layerTileMetaFeatures[layerId]) {
      return;
    }

    return this._layerTileMetaFeatures[layerId].find(tileMetaFeature => {
      const boundaryPoint = tileMetaFeature.geometry?.coordinates?.[0]?.[0];
      if (!boundaryPoint) {
        return false;
      }
      return isPointInTile(boundaryPoint[LAT_INDEX], boundaryPoint[LON_INDEX], x, y, z);
    });
  }

  private _onChange() {
    this.emit('change');
  }
}
