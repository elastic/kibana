/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getDestinationLayer, getLayerList, getLineLayer, getSourceLayer, lmc } from './map_config';
import {
  mockAPMIndexPatternIds,
  mockClientLayer,
  mockClientServerLineLayer,
  mockDestinationLayer,
  mockIndexPatternIds,
  mockLayerList,
  mockLayerListDouble,
  mockLayerListMixed,
  mockLineLayer,
  mockServerLayer,
  mockSourceLayer,
} from './__mocks__/mock';

jest.mock('uuid', () => {
  return {
    v1: jest.fn(() => 'uuid.v1()'),
    v4: jest.fn(() => 'uuid.v4()'),
  };
});

describe('map_config', () => {
  describe('#getLayerList', () => {
    test('it returns the complete layerList with a source, destination, and line layer', () => {
      const layerList = getLayerList(mockIndexPatternIds);
      expect(layerList).toStrictEqual(mockLayerList);
    });

    test('it returns the complete layerList for multiple indices', () => {
      const layerList = getLayerList([...mockIndexPatternIds, ...mockIndexPatternIds]);
      expect(layerList).toStrictEqual(mockLayerListDouble);
    });

    test('it returns the complete layerList for multiple indices with custom layer mapping', () => {
      const layerList = getLayerList([...mockIndexPatternIds, ...mockAPMIndexPatternIds]);
      expect(layerList).toStrictEqual(mockLayerListMixed);
    });
  });

  describe('#getSourceLayer', () => {
    test('it returns a source layer', () => {
      const layerList = getSourceLayer(
        mockIndexPatternIds[0].title,
        mockIndexPatternIds[0].id,
        lmc.default.source
      );
      expect(layerList).toStrictEqual(mockSourceLayer);
    });

    test('it returns a source layer for custom layer mapping', () => {
      const layerList = getSourceLayer(
        mockAPMIndexPatternIds[0].title,
        mockAPMIndexPatternIds[0].id,
        lmc[mockAPMIndexPatternIds[0].title].source
      );
      expect(layerList).toStrictEqual(mockClientLayer);
    });
  });

  describe('#getDestinationLayer', () => {
    test('it returns a destination layer', () => {
      const layerList = getDestinationLayer(
        mockIndexPatternIds[0].title,
        mockIndexPatternIds[0].id,
        lmc.default.destination
      );
      expect(layerList).toStrictEqual(mockDestinationLayer);
    });

    test('it returns a destination layer for custom layer mapping', () => {
      const layerList = getDestinationLayer(
        mockAPMIndexPatternIds[0].title,
        mockAPMIndexPatternIds[0].id,
        lmc[mockAPMIndexPatternIds[0].title].destination
      );
      expect(layerList).toStrictEqual(mockServerLayer);
    });
  });

  describe('#getLineLayer', () => {
    test('it returns a line layer', () => {
      const layerList = getLineLayer(
        mockIndexPatternIds[0].title,
        mockIndexPatternIds[0].id,
        lmc.default
      );
      expect(layerList).toStrictEqual(mockLineLayer);
    });

    test('it returns a line layer for custom layer mapping', () => {
      const layerList = getLineLayer(
        mockAPMIndexPatternIds[0].title,
        mockAPMIndexPatternIds[0].id,
        lmc[mockAPMIndexPatternIds[0].title]
      );
      expect(layerList).toStrictEqual(mockClientServerLineLayer);
    });
  });
});
