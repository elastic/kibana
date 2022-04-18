/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line max-classes-per-file
import { TileStatusTracker } from './tile_status_tracker';
import type { Map as MbMap } from '@kbn/mapbox-gl';
import { ILayer } from '../../classes/layers/layer';

class MockMbMap {
  public listeners: Array<{ type: string; callback: (e: unknown) => void }> = [];

  on(type: string, callback: (e: unknown) => void) {
    this.listeners.push({
      type,
      callback,
    });
  }

  emit(type: string, e: unknown) {
    this.listeners.forEach((listener) => {
      if (listener.type === type) {
        listener.callback(e);
      }
    });
  }

  off(type: string, callback: (e: unknown) => void) {
    this.listeners = this.listeners.filter((listener) => {
      return !(listener.type === type && listener.callback === callback);
    });
  }
}

class MockLayer {
  readonly _id: string;
  readonly _mbSourceId: string;
  constructor(id: string, mbSourceId: string) {
    this._id = id;
    this._mbSourceId = mbSourceId;
  }
  getId() {
    return this._id;
  }

  ownsMbSourceId(mbSourceId: string) {
    return this._mbSourceId === mbSourceId;
  }
}

function createMockLayer(id: string, mbSourceId: string): ILayer {
  return new MockLayer(id, mbSourceId) as unknown as ILayer;
}

function createMockMbDataEvent(mbSourceId: string, tileKey: string): unknown {
  return {
    sourceId: mbSourceId,
    dataType: 'source',
    tile: {
      tileID: {
        canonical: {
          x: 80,
          y: 10,
          z: 5,
        },
        key: tileKey,
      },
    },
    source: {
      type: 'vector',
    },
  };
}

async function sleep(timeout: number) {
  return await new Promise((resolve) => {
    setTimeout(() => {
      resolve(true);
    }, timeout);
  });
}

describe('TileStatusTracker', () => {
  test('should add and remove tiles', async () => {
    const mockMbMap = new MockMbMap();
    const loadedMap: Map<string, boolean> = new Map<string, boolean>();
    new TileStatusTracker({
      mbMap: mockMbMap as unknown as MbMap,
      updateTileStatus: (layer, areTilesLoaded) => {
        loadedMap.set(layer.getId(), areTilesLoaded);
      },
      getCurrentLayerList: () => {
        return [
          createMockLayer('foo', 'foosource'),
          createMockLayer('bar', 'barsource'),
          createMockLayer('foobar', 'foobarsource'),
        ];
      },
    });

    mockMbMap.emit('sourcedataloading', createMockMbDataEvent('foosource', 'aa11'));

    const aa11BarTile = createMockMbDataEvent('barsource', 'aa11');
    mockMbMap.emit('sourcedataloading', aa11BarTile);

    mockMbMap.emit('sourcedata', createMockMbDataEvent('foosource', 'aa11'));

    // simulate delay. Cache-checking is debounced.
    await sleep(300);

    expect(loadedMap.get('foo')).toBe(true);
    expect(loadedMap.get('bar')).toBe(false); // still outstanding tile requests
    expect(loadedMap.has('foobar')).toBe(true); // never received tile requests

    (aa11BarTile as { tile: { aborted: boolean } })!.tile.aborted = true; // abort tile
    mockMbMap.emit('sourcedataloading', createMockMbDataEvent('barsource', 'af1d'));
    mockMbMap.emit('sourcedataloading', createMockMbDataEvent('foosource', 'af1d'));
    mockMbMap.emit('error', createMockMbDataEvent('barsource', 'af1d'));

    // simulate delay. Cache-checking is debounced.
    await sleep(300);

    expect(loadedMap.get('foo')).toBe(false); // still outstanding tile requests
    expect(loadedMap.get('bar')).toBe(true); // tiles were aborted or errored
    expect(loadedMap.has('foobar')).toBe(true); // never received tile requests
  });

  test('should cleanup listeners on destroy', async () => {
    const mockMbMap = new MockMbMap();
    const tileStatusTracker = new TileStatusTracker({
      mbMap: mockMbMap as unknown as MbMap,
      updateTileStatus: () => {},
      getCurrentLayerList: () => {
        return [];
      },
    });

    expect(mockMbMap.listeners.length).toBe(4);
    tileStatusTracker.destroy();
    expect(mockMbMap.listeners.length).toBe(0);
  });
});
