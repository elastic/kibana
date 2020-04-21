/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { removeOrphanedSourcesAndLayers, syncLayerOrderForSingleLayer } from './utils';
import _ from 'lodash';

class MockMbMap {
  constructor(style) {
    this._style = _.cloneDeep(style);
  }

  getStyle() {
    return _.cloneDeep(this._style);
  }

  moveLayer(mbLayerId, nextMbLayerId) {
    const indexOfLayerToMove = this._style.layers.findIndex(layer => {
      return layer.id === mbLayerId;
    });

    const layerToMove = this._style.layers[indexOfLayerToMove];
    this._style.layers.splice(indexOfLayerToMove, 1);

    const indexOfNextLayer = this._style.layers.findIndex(layer => {
      return layer.id === nextMbLayerId;
    });

    this._style.layers.splice(indexOfNextLayer, 0, layerToMove);
  }

  removeSource(sourceId) {
    delete this._style.sources[sourceId];
  }

  removeLayer(layerId) {
    const layerToRemove = this._style.layers.findIndex(layer => {
      return layer.id === layerId;
    });
    this._style.layers.splice(layerToRemove, 1);
  }
}

class MockLayer {
  constructor(layerId, mbSourceIds, mbLayerIdsToSource) {
    this._mbSourceIds = mbSourceIds;
    this._mbLayerIdsToSource = mbLayerIdsToSource;
    this._layerId = layerId;
  }
  getId() {
    return this._layerId;
  }
  getMbSourceIds() {
    return this._mbSourceIds;
  }
  getMbLayersIdsToSource() {
    return this._mbLayerIdsToSource;
  }

  getMbLayerIds() {
    return this._mbLayerIdsToSource.map(({ id }) => id);
  }

  ownsMbLayerId(mbLayerId) {
    return this._mbLayerIdsToSource.some(mbLayerToSource => {
      return mbLayerToSource.id === mbLayerId;
    });
  }

  ownsMbSourceId(mbSourceId) {
    return this._mbSourceIds.some(id => mbSourceId === id);
  }
}

function getMockStyle(orderedMockLayerList) {
  const mockStyle = {
    sources: {},
    layers: [],
  };

  orderedMockLayerList.forEach(mockLayer => {
    mockLayer.getMbSourceIds().forEach(mbSourceId => {
      mockStyle.sources[mbSourceId] = {};
    });
    mockLayer.getMbLayersIdsToSource().forEach(({ id, source }) => {
      mockStyle.layers.push({
        id: id,
        source: source,
      });
    });
  });

  return mockStyle;
}

function makeSingleSourceMockLayer(layerId) {
  return new MockLayer(
    layerId,
    [layerId],
    [
      { id: layerId + '_fill', source: layerId },
      { id: layerId + '_line', source: layerId },
    ]
  );
}

function makeMultiSourceMockLayer(layerId) {
  const source1 = layerId + '_source1';
  const source2 = layerId + '_source2';
  return new MockLayer(
    layerId,
    [source1, source2],
    [
      { id: source1 + '_fill', source: source1 },
      { id: source2 + '_line', source: source2 },
      { id: source1 + '_line', source: source1 },
      { id: source1 + '_point', source: source1 },
    ]
  );
}

describe('mb/utils', () => {
  test('should remove foo and bar layer', async () => {
    const bazLayer = makeSingleSourceMockLayer('baz');
    const fooLayer = makeSingleSourceMockLayer('foo');
    const barLayer = makeSingleSourceMockLayer('bar');

    const currentLayerList = [bazLayer, fooLayer, barLayer];
    const nextLayerList = [bazLayer];

    const currentStyle = getMockStyle(currentLayerList);
    const mockMbMap = new MockMbMap(currentStyle);

    removeOrphanedSourcesAndLayers(mockMbMap, nextLayerList);
    const removedStyle = mockMbMap.getStyle();

    const nextStyle = getMockStyle(nextLayerList);
    expect(removedStyle).toEqual(nextStyle);
  });

  test('should remove foo and bar layer (multisource)', async () => {
    const bazLayer = makeMultiSourceMockLayer('baz');
    const fooLayer = makeMultiSourceMockLayer('foo');
    const barLayer = makeMultiSourceMockLayer('bar');

    const currentLayerList = [bazLayer, fooLayer, barLayer];
    const nextLayerList = [bazLayer];

    const currentStyle = getMockStyle(currentLayerList);
    const mockMbMap = new MockMbMap(currentStyle);

    removeOrphanedSourcesAndLayers(mockMbMap, nextLayerList);
    const removedStyle = mockMbMap.getStyle();

    const nextStyle = getMockStyle(nextLayerList);
    expect(removedStyle).toEqual(nextStyle);
  });

  test('should not remove anything', async () => {
    const bazLayer = makeSingleSourceMockLayer('baz');
    const fooLayer = makeSingleSourceMockLayer('foo');
    const barLayer = makeSingleSourceMockLayer('bar');

    const currentLayerList = [bazLayer, fooLayer, barLayer];
    const nextLayerList = [bazLayer, fooLayer, barLayer];

    const currentStyle = getMockStyle(currentLayerList);
    const mockMbMap = new MockMbMap(currentStyle);

    removeOrphanedSourcesAndLayers(mockMbMap, nextLayerList);
    const removedStyle = mockMbMap.getStyle();

    const nextStyle = getMockStyle(nextLayerList);
    expect(removedStyle).toEqual(nextStyle);
  });

  test('should move bar layer in front of foo layer', async () => {
    const fooLayer = makeSingleSourceMockLayer('foo');
    const barLayer = makeSingleSourceMockLayer('bar');

    const currentLayerOrder = [fooLayer, barLayer];
    const nextLayerListOrder = [barLayer, fooLayer];

    const currentStyle = getMockStyle(currentLayerOrder);
    const mockMbMap = new MockMbMap(currentStyle);
    syncLayerOrderForSingleLayer(mockMbMap, nextLayerListOrder);
    const orderedStyle = mockMbMap.getStyle();

    const nextStyle = getMockStyle(nextLayerListOrder);
    expect(orderedStyle).toEqual(nextStyle);
  });

  test('should fail at moving multiple layers (this tests a limitation of the sync)', async () => {
    //This is a known limitation of the layer order syncing.
    //It assumes only a single layer will have moved.
    //In practice, the Maps app will likely not cause multiple layers to move at once:
    // - the UX only allows dragging a single layer
    // - redux triggers a updates frequently enough
    //But this is conceptually "wrong", as the sync does not actually operate in the same way as all the other mb-syncing methods

    const fooLayer = makeSingleSourceMockLayer('foo');
    const barLayer = makeSingleSourceMockLayer('bar');
    const foozLayer = makeSingleSourceMockLayer('foo');
    const bazLayer = makeSingleSourceMockLayer('baz');

    const currentLayerOrder = [fooLayer, barLayer, foozLayer, bazLayer];
    const nextLayerListOrder = [bazLayer, barLayer, foozLayer, fooLayer];

    const currentStyle = getMockStyle(currentLayerOrder);
    const mockMbMap = new MockMbMap(currentStyle);
    syncLayerOrderForSingleLayer(mockMbMap, nextLayerListOrder);
    const orderedStyle = mockMbMap.getStyle();

    const nextStyle = getMockStyle(nextLayerListOrder);
    const isSyncSuccesful = _.isEqual(orderedStyle, nextStyle);
    expect(isSyncSuccesful).toEqual(false);
  });

  test('should move bar layer in front of foo layer (multi source)', async () => {
    const fooLayer = makeSingleSourceMockLayer('foo');
    const barLayer = makeMultiSourceMockLayer('bar');

    const currentLayerOrder = [fooLayer, barLayer];
    const nextLayerListOrder = [barLayer, fooLayer];

    const currentStyle = getMockStyle(currentLayerOrder);
    const mockMbMap = new MockMbMap(currentStyle);
    syncLayerOrderForSingleLayer(mockMbMap, nextLayerListOrder);
    const orderedStyle = mockMbMap.getStyle();

    const nextStyle = getMockStyle(nextLayerListOrder);
    expect(orderedStyle).toEqual(nextStyle);
  });

  test('should move bar layer in front of foo layer, but after baz layer', async () => {
    const bazLayer = makeSingleSourceMockLayer('baz');
    const fooLayer = makeSingleSourceMockLayer('foo');
    const barLayer = makeSingleSourceMockLayer('bar');

    const currentLayerOrder = [bazLayer, fooLayer, barLayer];
    const nextLayerListOrder = [bazLayer, barLayer, fooLayer];

    const currentStyle = getMockStyle(currentLayerOrder);
    const mockMbMap = new MockMbMap(currentStyle);
    syncLayerOrderForSingleLayer(mockMbMap, nextLayerListOrder);
    const orderedStyle = mockMbMap.getStyle();

    const nextStyle = getMockStyle(nextLayerListOrder);
    expect(orderedStyle).toEqual(nextStyle);
  });

  test('should reorder foo and bar and remove baz', async () => {
    const bazLayer = makeSingleSourceMockLayer('baz');
    const fooLayer = makeSingleSourceMockLayer('foo');
    const barLayer = makeSingleSourceMockLayer('bar');

    const currentLayerOrder = [bazLayer, fooLayer, barLayer];
    const nextLayerListOrder = [barLayer, fooLayer];

    const currentStyle = getMockStyle(currentLayerOrder);
    const mockMbMap = new MockMbMap(currentStyle);
    removeOrphanedSourcesAndLayers(mockMbMap, nextLayerListOrder);
    syncLayerOrderForSingleLayer(mockMbMap, nextLayerListOrder);
    const orderedStyle = mockMbMap.getStyle();

    const nextStyle = getMockStyle(nextLayerListOrder);
    expect(orderedStyle).toEqual(nextStyle);
  });

  test('should reorder foo and bar and remove baz, when having multi-source multi-layer data', async () => {
    const bazLayer = makeMultiSourceMockLayer('baz');
    const fooLayer = makeSingleSourceMockLayer('foo');
    const barLayer = makeMultiSourceMockLayer('bar');

    const currentLayerOrder = [bazLayer, fooLayer, barLayer];
    const nextLayerListOrder = [barLayer, fooLayer];

    const currentStyle = getMockStyle(currentLayerOrder);
    const mockMbMap = new MockMbMap(currentStyle);
    removeOrphanedSourcesAndLayers(mockMbMap, nextLayerListOrder);
    syncLayerOrderForSingleLayer(mockMbMap, nextLayerListOrder);
    const orderedStyle = mockMbMap.getStyle();

    const nextStyle = getMockStyle(nextLayerListOrder);
    expect(orderedStyle).toEqual(nextStyle);
  });
});
