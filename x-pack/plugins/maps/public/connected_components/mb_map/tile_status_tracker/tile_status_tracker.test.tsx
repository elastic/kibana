/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line max-classes-per-file
import React from 'react';
import { mount } from 'enzyme';
import type { Map as MbMap, MapSourceDataEvent } from '@kbn/mapbox-gl';
import type { TileError, TileMetaFeature } from '../../../../common/descriptor_types';
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

  getZoom() {
    return 5;
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
        return true;
      },
    };
  }
}

function createMockLayer(id: string, mbSourceId: string): ILayer {
  return new MockLayer(id, mbSourceId) as unknown as ILayer;
}

function createSourceDataEvent(mbSourceId: string, tileKey: string) {
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
  test('should set tile load status', async () => {
    const loadedMap: Map<string, boolean> = new Map<string, boolean>();
    const mockMbMap = new MockMbMap();

    const component = mount(
      <TileStatusTracker
        mbMap={mockMbMap as unknown as MbMap}
        layerList={[
          createMockLayer('foo', 'foosource'),
          createMockLayer('bar', 'barsource'),
          createMockLayer('foobar', 'foobarsource'),
        ]}
        onTileStateChange={(
          layerId: string,
          areTilesLoaded: boolean,
          tileMetaFeatures?: TileMetaFeature[],
          tileErrors?: TileError[]
        ) => {
          loadedMap.set(layerId, areTilesLoaded);
        }}
      />
    );

    mockMbMap.emit('sourcedataloading', createSourceDataEvent('foosource', 'aa11'));

    const aa11BarTile = createSourceDataEvent('barsource', 'aa11');
    mockMbMap.emit('sourcedataloading', aa11BarTile);

    mockMbMap.emit('sourcedata', createSourceDataEvent('foosource', 'aa11'));

    // simulate delay. Cache-checking is debounced.
    await sleep(300);

    expect(loadedMap.get('foo')).toBe(true);
    expect(loadedMap.get('bar')).toBe(false); // still outstanding tile requests
    expect(loadedMap.has('foobar')).toBe(false); // never received tile requests, status should not have been reported for layer

    (aa11BarTile.tile as MapSourceDataEvent['tile'])!.aborted = true; // abort tile
    mockMbMap.emit('sourcedataloading', createSourceDataEvent('barsource', 'af1d'));
    mockMbMap.emit('sourcedataloading', createSourceDataEvent('foosource', 'af1d'));
    mockMbMap.emit('error', {
      ...createSourceDataEvent('barsource', 'af1d'),
      error: {
        message: 'simulated error'
      }
    });

    // simulate delay. Cache-checking is debounced.
    await sleep(300);

    expect(loadedMap.get('foo')).toBe(false); // still outstanding tile requests
    expect(loadedMap.get('bar')).toBe(true); // tiles were aborted or errored
    expect(loadedMap.has('foobar')).toBe(false); // never received tile requests, status should not have been reported for layer

    component.unmount();

    expect(mockMbMap.listeners.length).toBe(0);
  });

  describe('onError', () => {
    test('should clear previous tile error when tile starts loading', async () => {
      const tileErrorsMap: Map<string, TileError[] | undefined> = new Map<string, TileError[] | undefined>();
      const mockMbMap = new MockMbMap();

      mount(
        <TileStatusTracker
          mbMap={mockMbMap as unknown as MbMap}
          layerList={[
            createMockLayer('layer1', 'layer1Source'),
            createMockLayer('layer2', 'layer2Source'),
          ]}
          onTileStateChange={(
            layerId: string,
            areTilesLoaded: boolean,
            tileMetaFeatures?: TileMetaFeature[],
            tileErrors?: TileError[]
          ) => {
            tileErrorsMap.set(layerId, tileErrors);
          }}
        />
      );

      mockMbMap.emit('sourcedataloading', createSourceDataEvent('layer1Source', 'aa11'));
      mockMbMap.emit('sourcedataloading', createSourceDataEvent('layer2Source', 'aa11'));
      mockMbMap.emit('error', {
        ...createSourceDataEvent('layer1Source', 'aa11'),
        error: {
          message: 'simulated error'
        }
      });

      // simulate delay. Cache-checking is debounced.
      await sleep(300);

      expect(tileErrorsMap.get('layer1')?.length).toBe(1);
      expect(tileErrorsMap.get('layer1')?.[0]).toEqual({
        message: 'simulated error',
        tileKey: '5/80/10',
      });
      expect(tileErrorsMap.get('layer2')).toBeUndefined();
      
      mockMbMap.emit('sourcedataloading', createSourceDataEvent('layer1Source', 'aa11'));

      // simulate delay. Cache-checking is debounced.
      await sleep(300);

      expect(tileErrorsMap.get('layer1')).toBeUndefined();
      expect(tileErrorsMap.get('layer2')).toBeUndefined();
    });

    test('should extract elasticsearch ErrorCause from response body', async () => {
      const tileErrorsMap: Map<string, TileError[] | undefined> = new Map<string, TileError[] | undefined>();
      const mockMbMap = new MockMbMap();
      const mockESErrorCause = {
        type: 'failure',
        reason: 'simulated es error',
      }

      mount(
        <TileStatusTracker
          mbMap={mockMbMap as unknown as MbMap}
          layerList={[
            createMockLayer('layer1', 'layer1Source'),
          ]}
          onTileStateChange={(
            layerId: string,
            areTilesLoaded: boolean,
            tileMetaFeatures?: TileMetaFeature[],
            tileErrors?: TileError[]
          ) => {
            tileErrorsMap.set(layerId, tileErrors);
          }}
        />
      );

      mockMbMap.emit('sourcedataloading', createSourceDataEvent('layer1Source', 'aa11'));
      mockMbMap.emit('error', {
        ...createSourceDataEvent('layer1Source', 'aa11'),
        error: {
          message: 'simulated error',
          status: 400,
          statusText: 'simulated ajax error',
          body: new Blob([JSON.stringify({ error: mockESErrorCause })]),
        }
      });

      // simulate delay. Cache-checking is debounced.
      await sleep(300);

      expect(tileErrorsMap.get('layer1')?.[0]).toEqual({
        message: 'simulated error',
        tileKey: '5/80/10',
        error: mockESErrorCause
      });
    });

    test('should safely handle non-json response body', async () => {
      const tileErrorsMap: Map<string, TileError[] | undefined> = new Map<string, TileError[] | undefined>();
      const mockMbMap = new MockMbMap();
      
      mount(
        <TileStatusTracker
          mbMap={mockMbMap as unknown as MbMap}
          layerList={[
            createMockLayer('layer1', 'layer1Source'),
          ]}
          onTileStateChange={(
            layerId: string,
            areTilesLoaded: boolean,
            tileMetaFeatures?: TileMetaFeature[],
            tileErrors?: TileError[]
          ) => {
            tileErrorsMap.set(layerId, tileErrors);
          }}
        />
      );

      mockMbMap.emit('sourcedataloading', createSourceDataEvent('layer1Source', 'aa11'));
      mockMbMap.emit('error', {
        ...createSourceDataEvent('layer1Source', 'aa11'),
        error: {
          message: 'simulated error',
          status: 400,
          statusText: 'simulated ajax error',
          body: new Blob(['I am not json']),
        }
      });

      // simulate delay. Cache-checking is debounced.
      await sleep(300);

      expect(tileErrorsMap.get('layer1')?.[0]).toEqual({
        message: 'simulated error',
        tileKey: '5/80/10',
      });
    });
  });
});
