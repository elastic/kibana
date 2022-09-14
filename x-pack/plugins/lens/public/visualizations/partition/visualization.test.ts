/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getPieVisualization } from './visualization';
import {
  PieVisualizationState,
  PieChartTypes,
  CategoryDisplay,
  NumberDisplay,
  LegendDisplay,
} from '../../../common';
import { layerTypes } from '../../../common';
import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import { createMockDatasource, createMockFramePublicAPI } from '../../mocks';
import { FramePublicAPI } from '../../types';
import { themeServiceMock } from '@kbn/core/public/mocks';
import { cloneDeep } from 'lodash';
import { PartitionChartsMeta } from './partition_charts_meta';

jest.mock('../../id_generator');

const LAYER_ID = 'l1';

const pieVisualization = getPieVisualization({
  paletteService: chartPluginMock.createPaletteRegistry(),
  kibanaTheme: themeServiceMock.createStartContract(),
});

function getExampleState(): PieVisualizationState {
  return {
    shape: PieChartTypes.PIE,
    layers: [
      {
        layerId: LAYER_ID,
        layerType: layerTypes.DATA,
        primaryGroups: [],
        metric: undefined,
        numberDisplay: NumberDisplay.PERCENT,
        categoryDisplay: CategoryDisplay.DEFAULT,
        legendDisplay: LegendDisplay.DEFAULT,
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
    describe('too many dimensions', () => {
      const state = { ...getExampleState(), shape: PieChartTypes.MOSAIC };
      const colIds = new Array(PartitionChartsMeta.mosaic.maxBuckets + 1)
        .fill(undefined)
        .map((_, i) => String(i + 1));

      state.layers[0].primaryGroups = colIds.slice(0, 2);
      state.layers[0].secondaryGroups = colIds.slice(2);

      it('returns error', () => {
        expect(pieVisualization.getErrorMessages(state)).toHaveLength(1);
      });

      it("doesn't count collapsed dimensions", () => {
        state.layers[0].collapseFns = {
          [colIds[0]]: 'some-fn',
        };

        expect(pieVisualization.getErrorMessages(state)).toHaveLength(0);
      });
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
            primaryGroups: ['a'],
            layerId: LAYER_ID,
            layerType: layerTypes.DATA,
            numberDisplay: NumberDisplay.PERCENT,
            categoryDisplay: CategoryDisplay.DEFAULT,
            legendDisplay: LegendDisplay.DEFAULT,
            nestedLegend: false,
            metric: undefined,
          },
        ],
        shape: PieChartTypes.DONUT,
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
          shape: PieChartTypes.DONUT,
        })
      );
    });
  });

  describe('#removeDimension', () => {
    it('removes corresponding collapse function if exists', () => {
      const state = getExampleState();

      const colIds = ['1', '2', '3', '4'];

      state.layers[0].primaryGroups = colIds;

      state.layers[0].collapseFns = {
        '1': 'sum',
        '3': 'max',
      };

      const newState = pieVisualization.removeDimension({
        layerId: LAYER_ID,
        columnId: '3',
        prevState: state,
        frame: mockFrame(),
      });

      expect(newState.layers[0].collapseFns).not.toHaveProperty('3');
    });
  });

  describe('#getConfiguration', () => {
    it('assigns correct icons to accessors', () => {
      const colIds = ['1', '2', '3', '4'];

      const frame = mockFrame();
      frame.datasourceLayers[LAYER_ID]!.getTableSpec = () =>
        colIds.map((id) => ({ columnId: id, fields: [] }));

      const state = getExampleState();
      state.layers[0].primaryGroups = colIds;
      state.layers[0].collapseFns = {
        '1': 'sum',
        '3': 'max',
      };
      const configuration = pieVisualization.getConfiguration({
        state,
        frame,
        layerId: state.layers[0].layerId,
      });

      // palette should be assigned to the first non-collapsed dimension
      expect(configuration.groups[0].accessors).toMatchInlineSnapshot(`
        Array [
          Object {
            "columnId": "1",
            "triggerIcon": "aggregate",
          },
          Object {
            "columnId": "2",
            "palette": Array [
              "red",
              "black",
            ],
            "triggerIcon": "colorBy",
          },
          Object {
            "columnId": "3",
            "triggerIcon": "aggregate",
          },
          Object {
            "columnId": "4",
            "triggerIcon": undefined,
          },
        ]
      `);

      const mosaicState = getExampleState();
      mosaicState.shape = PieChartTypes.MOSAIC;
      mosaicState.layers[0].primaryGroups = colIds.slice(0, 2);
      mosaicState.layers[0].secondaryGroups = colIds.slice(2);
      mosaicState.layers[0].collapseFns = {
        '1': 'sum',
        '3': 'max',
      };
      const mosaicConfiguration = pieVisualization.getConfiguration({
        state: mosaicState,
        frame,
        layerId: mosaicState.layers[0].layerId,
      });

      expect(mosaicConfiguration.groups.map(({ accessors }) => accessors)).toMatchInlineSnapshot(`
        Array [
          Array [
            Object {
              "columnId": "1",
              "triggerIcon": "aggregate",
            },
            Object {
              "columnId": "2",
              "palette": Array [
                "red",
                "black",
              ],
              "triggerIcon": "colorBy",
            },
          ],
          Array [
            Object {
              "columnId": "3",
              "triggerIcon": "aggregate",
            },
            Object {
              "columnId": "4",
              "triggerIcon": undefined,
            },
          ],
          Array [],
        ]
      `);
    });

    it("doesn't count collapsed columns toward the dimension limits", () => {
      const colIds = new Array(PartitionChartsMeta.pie.maxBuckets)
        .fill(undefined)
        .map((_, i) => String(i + 1));

      const frame = mockFrame();
      frame.datasourceLayers[LAYER_ID]!.getTableSpec = () =>
        colIds.map((id) => ({ columnId: id, fields: [] }));

      const state = getExampleState();
      state.layers[0].primaryGroups = colIds;

      const getConfig = (_state: PieVisualizationState) =>
        pieVisualization.getConfiguration({
          state: _state,
          frame,
          layerId: state.layers[0].layerId,
        });

      expect(getConfig(state).groups[0].supportsMoreColumns).toBeFalsy();

      const stateWithCollapsed = cloneDeep(state);
      stateWithCollapsed.layers[0].collapseFns = { '1': 'sum' };

      expect(getConfig(stateWithCollapsed).groups[0].supportsMoreColumns).toBeTruthy();
    });
  });
});
