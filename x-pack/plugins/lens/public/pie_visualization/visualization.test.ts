/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getPieVisualization } from './visualization';
import type { PieVisualizationState } from '../../common/expressions';
import { layerTypes } from '../../common';
import { chartPluginMock } from '../../../../../src/plugins/charts/public/mocks';
import { createMockDatasource, createMockFramePublicAPI } from '../mocks';
import { FramePublicAPI } from '../types';

jest.mock('../id_generator');

const LAYER_ID = 'l1';

const pieVisualization = getPieVisualization({
  paletteService: chartPluginMock.createPaletteRegistry(),
});

function getExampleState(): PieVisualizationState {
  return {
    shape: 'pie',
    layers: [
      {
        layerId: LAYER_ID,
        layerType: layerTypes.DATA,
        groups: [],
        metric: undefined,
        numberDisplay: 'percent',
        categoryDisplay: 'default',
        legendDisplay: 'default',
        nestedLegend: false,
      },
    ],
  };
}

function mockFrame(): FramePublicAPI {
  return {
    ...createMockFramePublicAPI(),
    datasourceLayers: {
      l1: createMockDatasource('l1').publicAPIMock,
      l42: createMockDatasource('l42').publicAPIMock,
    },
  };
}

// Just a basic bootstrap here to kickstart the tests
describe('pie_visualization', () => {
  describe('#getErrorMessages', () => {
    it('returns undefined if no error is raised', () => {
      const error = pieVisualization.getErrorMessages(getExampleState());

      expect(error).not.toBeDefined();
    });
  });

  describe('#getSupportedLayers', () => {
    it('should return a single layer type', () => {
      expect(pieVisualization.getSupportedLayers()).toHaveLength(1);
    });
  });

  describe('#getLayerType', () => {
    it('should return the type only if the layer is in the state', () => {
      expect(pieVisualization.getLayerType(LAYER_ID, getExampleState())).toEqual(layerTypes.DATA);
      expect(pieVisualization.getLayerType('foo', getExampleState())).toBeUndefined();
    });
  });

  describe('#setDimension', () => {
    it('returns expected state', () => {
      const prevState: PieVisualizationState = {
        layers: [
          {
            groups: ['a'],
            layerId: LAYER_ID,
            layerType: layerTypes.DATA,
            numberDisplay: 'percent',
            categoryDisplay: 'default',
            legendDisplay: 'default',
            nestedLegend: false,
            metric: undefined,
          },
        ],
        shape: 'donut',
      };
      const setDimensionResult = pieVisualization.setDimension({
        prevState,
        columnId: 'x',
        layerId: LAYER_ID,
        groupId: 'a',
        frame: mockFrame(),
      });

      expect(setDimensionResult).toEqual(
        expect.objectContaining({
          shape: 'donut',
        })
      );
    });
  });
});
