/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EventEmitter } from 'events';
import { TileRequest } from './types';

export class VectorTileAdapter extends EventEmitter {
  private _layers: Record<string, { label: string; tileUrl: string }> = {};
  private _tiles: Array<{ x: number; y: number; z: number }> = [];

  addLayer(layerId: string, label: string, tileUrl: string) {
    this._layers[layerId] = { label, tileUrl };
    this._onChange();
  }

  removeLayer(layerId: string) {
    delete this._layers[layerId];
    this._onChange();
  }

  setTiles(tiles: Array<{ x: number; y: number; z: number }>) {
    this._tiles = tiles;
    this._onChange();
  }

  getLayerOptions(): Array<{ value: string; label: string }> {
    return Object.keys(this._layers).map((layerId) => {
      return {
        value: layerId,
        label: this._layers[layerId].label,
      };
    });
  }

  getTileRequests(layerId: string): TileRequest[] {
    if (!this._layers[layerId]) {
      return [];
    }

    const { tileUrl } = this._layers[layerId];
    return this._tiles.map((tile) => {
      return {
        layerId,
        tileUrl,
        ...tile,
      };
    });
  }

  _onChange() {
    this.emit('change');
  }
}
