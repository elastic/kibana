/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EventEmitter } from 'events';
import { TileRequest } from './types';
import type { ILayer } from '../../classes/layers/layer';

export class VectorTileAdapter extends EventEmitter {
  private _layerLabels: Record<string, string> = {};
  private _tileRequests: TileRequest[] = [];

  async addTileRequest(layer: ILayer, tileZXYKey: string, tileUrl: string) {
    this._tileRequests.push({
      layerId: layer.getId(),
      tileUrl,
      tileZXYKey,
    });
    this._layerLabels[layer.getId()] = await layer.getDisplayName();
    this._onChange();
  }

  removeLayer(layerId: string) {
    delete this._layerLabels[layerId];
    this._tileRequests = this._tileRequests.filter((tileRequest) => {
      return tileRequest.layerId !== layerId;
    });
    this._onChange();
  }

  reset() {
    this._tileRequests = [];
    this._layerLabels = {};
    this._onChange();
  }

  getLayerOptions(): Array<{ value: string; label: string }> {
    return Object.keys(this._layerLabels).map((layerId) => {
      return {
        value: layerId,
        label: this._layerLabels[layerId],
      };
    });
  }

  getTileRequests(layerId: string): TileRequest[] {
    return this._tileRequests.filter((tileRequest) => {
      return tileRequest.layerId === layerId;
    });
  }

  _onChange() {
    this.emit('change');
  }
}
