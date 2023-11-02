/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TileError } from '../../../../common/descriptor_types';

type LayerId = string;
type TileKey = string;

export class TileErrorCache {
  private _cache: Record<LayerId, Record<TileKey, TileError>> = {};

  public clear() {
    this._cache = {};
  }

  public clearTileError(layerId: string, tileKey: string) {
    if (!(layerId in this._cache)) {
      return;
    }

    const tileErrors = this._cache[layerId];
    if (!(tileKey in tileErrors)) {
      return;
    }

    delete tileErrors[tileKey];
    this._cache[layerId] = tileErrors;
  }

  public hasTileError(layerId: string, tileKey: string) {
    return layerId in this._cache
      ? tileKey in this._cache[layerId]
      : false;
  }

  public setTileError(layerId: string, tileError: TileError) {
    const tileErrors = this._cache[layerId] ? this._cache[layerId] : {};
    tileErrors[tileError.tileKey] = tileError;
    this._cache[layerId] = tileErrors;
  }

  public getTileErrors(layerId: string) {
    return this._cache[layerId]
      ? Object.values(this._cache[layerId])
      : undefined;
  }
}