/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mockLayerList } from './__mocks__/regions_layer.mock';
import { getLayerList } from '../LayerList';

describe('LayerList', () => {
  describe('getLayerList', () => {
    test('it returns the region layer', () => {
      const layerList = getLayerList();
      expect(layerList).toStrictEqual(mockLayerList);
    });
  });
});
