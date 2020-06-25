/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
jest.mock('ui/new_platform');
jest.mock('../../../kibana_services', () => {
  return {
    getUiSettings() {
      return {
        get() {
          return false;
        },
      };
    },
  };
});

import { MVTSingleLayerVectorSource } from '../../sources/mvt_single_layer_vector_source';
import {
  TiledSingleLayerVectorSourceDescriptor,
  VectorLayerDescriptor,
} from '../../../../common/descriptor_types';
import { SOURCE_TYPES } from '../../../../common/constants';
import { TiledVectorLayer } from './tiled_vector_layer';

function createLayer(
  layerOptions: Partial<VectorLayerDescriptor> = {},
  sourceOptions: Partial<TiledSingleLayerVectorSourceDescriptor> = {}
): TiledVectorLayer {
  const sourceDescriptor: TiledSingleLayerVectorSourceDescriptor = {
    type: SOURCE_TYPES.MVT_SINGLE_LAYER,
    urlTemplate: 'https://example.com/{x}/{y}/{z}.pbf',
    layerName: 'foobar',
    minSourceZoom: 4,
    maxSourceZoom: 14,
    fields: [],
    tooltipProperties: [],
    ...sourceOptions,
  };
  const mvtSource = new MVTSingleLayerVectorSource(sourceDescriptor);

  const defaultLayerOptions = {
    ...layerOptions,
    sourceDescriptor,
  };
  const layerDescriptor = TiledVectorLayer.createDescriptor(defaultLayerOptions);
  return new TiledVectorLayer({ layerDescriptor, source: mvtSource });
}

describe('visiblity', () => {
  it('should get minzoom from source', async () => {
    const layer: TiledVectorLayer = createLayer({}, {});
    expect(layer.getMinZoom()).toEqual(4);
  });
  it('should get maxzoom from default', async () => {
    const layer: TiledVectorLayer = createLayer({}, {});
    expect(layer.getMaxZoom()).toEqual(24);
  });
  it('should get maxzoom from layer options', async () => {
    const layer: TiledVectorLayer = createLayer({ maxZoom: 10 }, {});
    expect(layer.getMaxZoom()).toEqual(10);
  });
});
