/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_ZOOM, MIN_ZOOM } from '../../../../common/constants';
import { LayerGroup } from './layer_group';
import { ILayer } from '../layer';

describe('getMinZoom', () => {
  test('should return MIN_ZOOM when there are no children', async () => {
    const layerGroup = new LayerGroup({ layerDescriptor: LayerGroup.createDescriptor({}) });
    expect(layerGroup.getMinZoom()).toBe(MIN_ZOOM);
  });

  test('should return smallest child.getMinZoom()', async () => {
    const layerGroup = new LayerGroup({ layerDescriptor: LayerGroup.createDescriptor({}) });
    layerGroup.setChildren([
      {
        getMinZoom: () => {
          return 1;
        },
      } as unknown as ILayer,
      {
        getMinZoom: () => {
          return 4;
        },
      } as unknown as ILayer,
    ]);
    expect(layerGroup.getMinZoom()).toBe(1);
  });
});

describe('getMaxZoom', () => {
  test('should return MAX_ZOOM when there are no children', async () => {
    const layerGroup = new LayerGroup({ layerDescriptor: LayerGroup.createDescriptor({}) });
    expect(layerGroup.getMaxZoom()).toBe(MAX_ZOOM);
  });

  test('should return largest child.getMaxZoom()', async () => {
    const layerGroup = new LayerGroup({ layerDescriptor: LayerGroup.createDescriptor({}) });
    layerGroup.setChildren([
      {
        getMaxZoom: () => {
          return 18;
        },
      } as unknown as ILayer,
      {
        getMaxZoom: () => {
          return 20;
        },
      } as unknown as ILayer,
    ]);
    expect(layerGroup.getMaxZoom()).toBe(20);
  });
});
