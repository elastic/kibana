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
import type { IVectorSource } from '../../../classes/sources/vector_source';

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

  getBounds() {
    return {
      getWest: () => {
        return -115.5;
      },
      getSouth: () => {
        return 34.5;
      },
      getEast: () => {
        return -98;
      },
      getNorth: () => {
        return 44;
      },
    };
  }

  querySourceFeatures() {
    return [];
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

  getMbSourceId() {
    return this._mbSourceId;
  }

  isVisible() {
    return true;
  }

  getSource() {
    return {
      isMvt: () => {
        return true;
      },
      getIndexPatternId: () => {
        return '1234';
      },
    };
  }
}

function createMockLayer(id: string, mbSourceId: string): ILayer {
  return new MockLayer(id, mbSourceId) as unknown as ILayer;
}

function createSourceDataEvent(mbSourceId: string, canonical: { x: number; y: number; z: number }) {
  return {
    sourceId: mbSourceId,
    dataType: 'source',
    tile: {
      tileID: {
        canonical: {
          ...canonical,
        },
        key: `uniqueTileKey${Object.values(canonical).join(',')}`, // not shape of actual key returned from maplibre
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
  const AU55_CANONICAL_TILE = { x: 6, y: 12, z: 5 };
  const AV55_CANONICAL_TILE = { x: 7, y: 12, z: 5 };
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

    mockMbMap.emit('sourcedataloading', createSourceDataEvent('foosource', AU55_CANONICAL_TILE));

    const au55BarTile = createSourceDataEvent('barsource', AU55_CANONICAL_TILE);
    mockMbMap.emit('sourcedataloading', au55BarTile);

    mockMbMap.emit('sourcedata', createSourceDataEvent('foosource', AU55_CANONICAL_TILE));

    // simulate delay. Cache-checking is debounced.
    await sleep(300);

    expect(loadedMap.get('foo')).toBe(true);
    expect(loadedMap.get('bar')).toBe(false); // still outstanding tile requests
    expect(loadedMap.has('foobar')).toBe(false); // never received tile requests, status should not have been reported for layer

    (au55BarTile.tile as MapSourceDataEvent['tile'])!.aborted = true; // abort tile
    mockMbMap.emit('sourcedataloading', createSourceDataEvent('barsource', AV55_CANONICAL_TILE));
    mockMbMap.emit('sourcedataloading', createSourceDataEvent('foosource', AV55_CANONICAL_TILE));
    mockMbMap.emit('error', {
      ...createSourceDataEvent('barsource', AV55_CANONICAL_TILE),
      error: {
        message: 'simulated error',
      },
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
    const tileErrorsMap: Map<string, TileError[] | undefined> = new Map<
      string,
      TileError[] | undefined
    >();
    const onTileStateChange = (
      layerId: string,
      areTilesLoaded: boolean,
      tileMetaFeatures?: TileMetaFeature[],
      tileErrors?: TileError[]
    ) => {
      tileErrorsMap.set(layerId, tileErrors);
    };
    const IN_VIEW_CANONICAL_TILE = { x: 6, y: 12, z: 5 }; // canonical key 'au55'

    beforeEach(() => {
      tileErrorsMap.clear();
    });

    test('should clear previous tile error when tile starts loading', async () => {
      const mockMbMap = new MockMbMap();

      mount(
        <TileStatusTracker
          mbMap={mockMbMap as unknown as MbMap}
          layerList={[
            createMockLayer('layer1', 'layer1Source'),
            createMockLayer('layer2', 'layer2Source'),
          ]}
          onTileStateChange={onTileStateChange}
        />
      );

      mockMbMap.emit(
        'sourcedataloading',
        createSourceDataEvent('layer1Source', IN_VIEW_CANONICAL_TILE)
      );
      mockMbMap.emit(
        'sourcedataloading',
        createSourceDataEvent('layer2Source', IN_VIEW_CANONICAL_TILE)
      );
      mockMbMap.emit('error', {
        ...createSourceDataEvent('layer1Source', IN_VIEW_CANONICAL_TILE),
        error: {
          message: 'simulated error',
        },
      });

      // simulate delay. Cache-checking is debounced.
      await sleep(300);

      expect(tileErrorsMap.get('layer1')?.length).toBe(1);
      expect(tileErrorsMap.get('layer1')?.[0]).toEqual({
        message: 'simulated error',
        tileKey: '5/6/12',
      });
      expect(tileErrorsMap.get('layer2')).toBeUndefined();

      mockMbMap.emit(
        'sourcedataloading',
        createSourceDataEvent('layer1Source', IN_VIEW_CANONICAL_TILE)
      );

      // simulate delay. Cache-checking is debounced.
      await sleep(300);

      expect(tileErrorsMap.get('layer1')).toBeUndefined();
      expect(tileErrorsMap.get('layer2')).toBeUndefined();
    });

    test('should clear layer tile errors when layer is not tiled', async () => {
      const mockMbMap = new MockMbMap();
      const layer1 = createMockLayer('layer1', 'layer1Source');

      const wrapper = mount(
        <TileStatusTracker
          mbMap={mockMbMap as unknown as MbMap}
          layerList={[layer1]}
          onTileStateChange={onTileStateChange}
        />
      );

      mockMbMap.emit(
        'sourcedataloading',
        createSourceDataEvent('layer1Source', IN_VIEW_CANONICAL_TILE)
      );
      mockMbMap.emit('error', {
        ...createSourceDataEvent('layer1Source', IN_VIEW_CANONICAL_TILE),
        error: {
          message: 'simulated error',
        },
      });

      // simulate delay. Cache-checking is debounced.
      await sleep(300);

      expect(tileErrorsMap.get('layer1')?.length).toBe(1);

      const geojsonLayer1 = createMockLayer('layer1', 'layer1Source');
      geojsonLayer1.getSource = () => {
        return {
          isMvt() {
            return false;
          },
        } as unknown as IVectorSource;
      };
      wrapper.setProps({ layerList: [geojsonLayer1] });

      // simulate delay. Cache-checking is debounced.
      await sleep(300);

      expect(tileErrorsMap.get('layer1')).toBeUndefined();
    });

    test('should only return tile errors within map zoom', async () => {
      const mockMbMap = new MockMbMap();

      mount(
        <TileStatusTracker
          mbMap={mockMbMap as unknown as MbMap}
          layerList={[createMockLayer('layer1', 'layer1Source')]}
          onTileStateChange={onTileStateChange}
        />
      );

      const OUT_OF_ZOOM_CANONICAL_TILE = {
        ...IN_VIEW_CANONICAL_TILE,
        z: 4, // out of view because zoom is not 5
      };
      mockMbMap.emit(
        'sourcedataloading',
        createSourceDataEvent('layer1Source', OUT_OF_ZOOM_CANONICAL_TILE)
      );
      mockMbMap.emit('error', {
        ...createSourceDataEvent('layer1Source', OUT_OF_ZOOM_CANONICAL_TILE),
        error: {
          message: 'simulated error',
        },
      });

      // simulate delay. Cache-checking is debounced.
      await sleep(300);

      expect(tileErrorsMap.get('layer1')).toBeUndefined();
    });

    test('should only return tile errors within map bounds', async () => {
      const mockMbMap = new MockMbMap();

      mount(
        <TileStatusTracker
          mbMap={mockMbMap as unknown as MbMap}
          layerList={[createMockLayer('layer1', 'layer1Source')]}
          onTileStateChange={onTileStateChange}
        />
      );

      const OUT_OF_VIEW_CANONICAL_TILE = {
        ...IN_VIEW_CANONICAL_TILE,
        y: 13, // out of view because tile is out side of view bounds to the south
      };
      mockMbMap.emit(
        'sourcedataloading',
        createSourceDataEvent('layer1Source', OUT_OF_VIEW_CANONICAL_TILE)
      );
      mockMbMap.emit('error', {
        ...createSourceDataEvent('layer1Source', OUT_OF_VIEW_CANONICAL_TILE),
        error: {
          message: 'simulated error',
        },
      });

      // simulate delay. Cache-checking is debounced.
      await sleep(300);

      expect(tileErrorsMap.get('layer1')).toBeUndefined();
    });

    test('should extract elasticsearch ErrorCause from response body', async () => {
      const mockMbMap = new MockMbMap();
      const mockESErrorCause = {
        type: 'failure',
        reason: 'simulated es error',
      };

      mount(
        <TileStatusTracker
          mbMap={mockMbMap as unknown as MbMap}
          layerList={[createMockLayer('layer1', 'layer1Source')]}
          onTileStateChange={onTileStateChange}
        />
      );

      mockMbMap.emit(
        'sourcedataloading',
        createSourceDataEvent('layer1Source', IN_VIEW_CANONICAL_TILE)
      );
      mockMbMap.emit('error', {
        ...createSourceDataEvent('layer1Source', IN_VIEW_CANONICAL_TILE),
        error: {
          message: 'simulated error',
          status: 400,
          statusText: 'simulated ajax error',
          body: new Blob([JSON.stringify({ error: mockESErrorCause })]),
        },
      });

      // simulate delay. Cache-checking is debounced.
      await sleep(300);

      expect(tileErrorsMap.get('layer1')?.[0]).toEqual({
        message: 'simulated error',
        tileKey: '5/6/12',
        error: mockESErrorCause,
      });
    });

    test('should safely handle non-json response body', async () => {
      const mockMbMap = new MockMbMap();

      mount(
        <TileStatusTracker
          mbMap={mockMbMap as unknown as MbMap}
          layerList={[createMockLayer('layer1', 'layer1Source')]}
          onTileStateChange={onTileStateChange}
        />
      );

      mockMbMap.emit(
        'sourcedataloading',
        createSourceDataEvent('layer1Source', IN_VIEW_CANONICAL_TILE)
      );
      mockMbMap.emit('error', {
        ...createSourceDataEvent('layer1Source', IN_VIEW_CANONICAL_TILE),
        error: {
          message: 'simulated error',
          status: 400,
          statusText: 'simulated ajax error',
          body: new Blob(['I am not json']),
        },
      });

      // simulate delay. Cache-checking is debounced.
      await sleep(300);

      expect(tileErrorsMap.get('layer1')?.[0]).toEqual({
        message: 'simulated error',
        tileKey: '5/6/12',
      });
    });
  });
});
