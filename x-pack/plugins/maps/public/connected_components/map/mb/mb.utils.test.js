/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { removeOrphanedSourcesAndLayers } from './utils';
import { SPATIAL_FILTERS_LAYER_ID } from '../../../../common/constants';
import _ from 'lodash';

class MockMbMap {
  constructor(style) {
    this._style = _.cloneDeep(style);
  }

  getStyle() {
    return _.cloneDeep(this._style);
  }

  moveLayer(mbLayerId, nextMbLayerId) {
    const indexOfLayerToMove = this._style.layers.findIndex((layer) => {
      return layer.id === mbLayerId;
    });

    const layerToMove = this._style.layers[indexOfLayerToMove];
    this._style.layers.splice(indexOfLayerToMove, 1);

    const indexOfNextLayer = this._style.layers.findIndex((layer) => {
      return layer.id === nextMbLayerId;
    });

    this._style.layers.splice(indexOfNextLayer, 0, layerToMove);
  }

  removeSource(sourceId) {
    delete this._style.sources[sourceId];
  }

  removeLayer(layerId) {
    const layerToRemove = this._style.layers.findIndex((layer) => {
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
    return this._mbLayerIdsToSource.some((mbLayerToSource) => {
      return mbLayerToSource.id === mbLayerId;
    });
  }

  ownsMbSourceId(mbSourceId) {
    return this._mbSourceIds.some((id) => mbSourceId === id);
  }
}

function getMockStyle(orderedMockLayerList) {
  const mockStyle = {
    sources: {},
    layers: [],
  };

  orderedMockLayerList.forEach((mockLayer) => {
    mockLayer.getMbSourceIds().forEach((mbSourceId) => {
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

describe('removeOrphanedSourcesAndLayers', () => {
  const spatialFilterLayer = makeMultiSourceMockLayer(SPATIAL_FILTERS_LAYER_ID);
  test('should remove foo and bar layer', async () => {
    const bazLayer = makeSingleSourceMockLayer('baz');
    const fooLayer = makeSingleSourceMockLayer('foo');
    const barLayer = makeSingleSourceMockLayer('bar');

    const currentLayerList = [bazLayer, fooLayer, barLayer];
    const nextLayerList = [bazLayer];

    const currentStyle = getMockStyle(currentLayerList);
    const mockMbMap = new MockMbMap(currentStyle);

    removeOrphanedSourcesAndLayers(mockMbMap, nextLayerList, spatialFilterLayer);
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

    removeOrphanedSourcesAndLayers(mockMbMap, nextLayerList, spatialFilterLayer);
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

    removeOrphanedSourcesAndLayers(mockMbMap, nextLayerList, spatialFilterLayer);
    const removedStyle = mockMbMap.getStyle();

    const nextStyle = getMockStyle(nextLayerList);
    expect(removedStyle).toEqual(nextStyle);
  });

  test('should not remove spatial filter layer and sources when spatialFilterLayer is provided', async () => {
    const styleWithSpatialFilters = getMockStyle([spatialFilterLayer]);
    const mockMbMap = new MockMbMap(styleWithSpatialFilters);

    removeOrphanedSourcesAndLayers(mockMbMap, [], spatialFilterLayer);
    expect(mockMbMap.getStyle()).toEqual(styleWithSpatialFilters);
  });
});
