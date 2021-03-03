/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getPieVisualization } from './visualization';
import { PieVisualizationState } from './types';
import { chartPluginMock } from '../../../../../src/plugins/charts/public/mocks';

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

// Just a basic bootstrap here to kickstart the tests
describe('pie_visualization', () => {
  describe('#getErrorMessages', () => {
    it('returns undefined if no error is raised', () => {
      const error = pieVisualization.getErrorMessages(getExampleState());

      expect(error).not.toBeDefined();
    });
  });
  describe('#setDimension', () => {
    it('returns expected state', () => {
      const prevState: PieVisualizationState = {
        layers: [
          {
            groups: ['a'],
            layerId: LAYER_ID,
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
      });

      expect(setDimensionResult).toEqual(
        expect.objectContaining({
          shape: 'donut',
        })
      );
    });
  });
});
