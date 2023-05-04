/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line max-classes-per-file
import React from 'react';
import { mount } from 'enzyme';
import type { Map as MbMap } from '@kbn/mapbox-gl';
import { TileStatusTracker } from './tile_status_tracker';
import { ILayer } from '../../../classes/layers/layer';

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

  isVisible() {
    return true;
  }

  getSource() {
    return {
      isESSource() {
        return false;
      },
    };
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

const mockMbMap = new MockMbMap();
const defaultProps = {
  mbMap: mockMbMap as unknown as MbMap,
  layerList: [],
  setAreTilesLoaded: () => {},
  updateMetaFromTiles: () => {},
  clearTileLoadError: () => {},
  setTileLoadError: () => {},
};

describe('TileStatusTracker', () => {
  test('should set tile load status', async () => {
    const layerList = [
      createMockLayer('foo', 'foosource'),
      createMockLayer('bar', 'barsource'),
      createMockLayer('foobar', 'foobarsource'),
    ];
    const loadedMap: Map<string, boolean> = new Map<string, boolean>();
    const setAreTilesLoaded = (layerId: string, areTilesLoaded: boolean) => {
      loadedMap.set(layerId, areTilesLoaded);
    };

    const component = mount(
      <TileStatusTracker
        {...defaultProps}
        layerList={layerList}
        setAreTilesLoaded={setAreTilesLoaded}
      />
    );

    mockMbMap.emit('sourcedataloading', createMockMbDataEvent('foosource', 'aa11'));

    const aa11BarTile = createMockMbDataEvent('barsource', 'aa11');
    mockMbMap.emit('sourcedataloading', aa11BarTile);

    mockMbMap.emit('sourcedata', createMockMbDataEvent('foosource', 'aa11'));

    // simulate delay. Cache-checking is debounced.
    await sleep(300);

    expect(loadedMap.get('foo')).toBe(true);
    expect(loadedMap.get('bar')).toBe(false); // still outstanding tile requests
    expect(loadedMap.has('foobar')).toBe(false); // never received tile requests, status should not have been reported for layer

    (aa11BarTile as { tile: { aborted: boolean } })!.tile.aborted = true; // abort tile
    mockMbMap.emit('sourcedataloading', createMockMbDataEvent('barsource', 'af1d'));
    mockMbMap.emit('sourcedataloading', createMockMbDataEvent('foosource', 'af1d'));
    mockMbMap.emit('error', createMockMbDataEvent('barsource', 'af1d'));

    // simulate delay. Cache-checking is debounced.
    await sleep(300);

    expect(loadedMap.get('foo')).toBe(false); // still outstanding tile requests
    expect(loadedMap.get('bar')).toBe(true); // tiles were aborted or errored
    expect(loadedMap.has('foobar')).toBe(false); // never received tile requests, status should not have been reported for layer

    component.unmount();

    expect(mockMbMap.listeners.length).toBe(0);
  });
});
