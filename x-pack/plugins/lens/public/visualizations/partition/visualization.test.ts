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
import { LayerTypes } from '@kbn/expression-xy-plugin/public';
import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import { createMockDatasource, createMockFramePublicAPI } from '../../mocks';
import { FramePublicAPI, OperationDescriptor, Visualization } from '../../types';
import { themeServiceMock } from '@kbn/core/public/mocks';
import { cloneDeep } from 'lodash';
import { PartitionChartsMeta } from './partition_charts_meta';
import { CollapseFunction } from '../../../common/expressions';
import { PaletteOutput } from '@kbn/coloring';

jest.mock('../../id_generator');

const LAYER_ID = 'l1';

const findPrimaryGroup = (config: ReturnType<Visualization['getConfiguration']>) =>
  config.groups.find((group) => group.groupId === 'primaryGroups');

const findMetricGroup = (config: ReturnType<Visualization['getConfiguration']>) =>
  config.groups.find((group) => group.groupId === 'metric');

const paletteServiceMock = chartPluginMock.createPaletteRegistry();

const pieVisualization = getPieVisualization({
  paletteService: paletteServiceMock,
  kibanaTheme: themeServiceMock.createStartContract(),
});

function getExampleState(): PieVisualizationState {
  return {
    shape: PieChartTypes.PIE,
    layers: [
      {
        layerId: LAYER_ID,
        layerType: LayerTypes.DATA,
        primaryGroups: [],
        metrics: [],
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
  beforeEach(() => jest.clearAllMocks());

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
        const localState = cloneDeep(state);
        localState.layers[0].collapseFns = {
          [colIds[0]]: 'some-fn' as CollapseFunction,
        };

        expect(pieVisualization.getErrorMessages(localState)).toHaveLength(0);
      });

      it('counts multiple metrics as an extra bucket dimension', () => {
        const localState = cloneDeep(state);
        localState.layers[0].primaryGroups.pop();
        expect(pieVisualization.getErrorMessages(localState)).toHaveLength(0);

        localState.layers[0].metrics.push('one-metric', 'another-metric');

        expect(pieVisualization.getErrorMessages(localState)).toHaveLength(1);
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
      expect(pieVisualization.getLayerType(LAYER_ID, getExampleState())).toEqual(LayerTypes.DATA);
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
            layerType: LayerTypes.DATA,
            numberDisplay: NumberDisplay.PERCENT,
            categoryDisplay: CategoryDisplay.DEFAULT,
            legendDisplay: LegendDisplay.DEFAULT,
            nestedLegend: false,
            metrics: [],
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
    it('removes corresponding color by dimension if exists', () => {
      const state = getExampleState();

      const colIds = ['1', '2', '3', '4'];

      state.layers[0].primaryGroups = colIds;

      state.layers[0].colorsByDimension = {
        '1': 'custom-color1',
        '3': 'custom-color2',
      };

      const newState = pieVisualization.removeDimension({
        layerId: LAYER_ID,
        columnId: '3',
        prevState: state,
        frame: mockFrame(),
      });

      expect(newState.layers[0].colorsByDimension).toMatchInlineSnapshot(`
        Object {
          "1": "custom-color1",
        }
      `);
    });
    it('removes custom palette if removing final slice-by dimension in multi-metric chart', () => {
      const state = getExampleState();

      state.layers[0].primaryGroups = ['1', '2'];
      state.layers[0].allowMultipleMetrics = true;
      state.layers[0].metrics = ['3', '4'];
      state.palette = {} as PaletteOutput;

      let newState = pieVisualization.removeDimension({
        layerId: LAYER_ID,
        columnId: '1',
        prevState: state,
        frame: mockFrame(),
      });

      expect(newState.layers[0].primaryGroups).toEqual(['2']);
      expect(newState.palette).toBeDefined();

      newState = pieVisualization.removeDimension({
        layerId: LAYER_ID,
        columnId: '2',
        prevState: newState,
        frame: mockFrame(),
      });

      expect(newState.layers[0].primaryGroups).toEqual([]);
      expect(newState.palette).toBeUndefined();
    });
  });

  describe('#getConfiguration', () => {
    describe('assigning icons to accessors', () => {
      const colIds = ['1', '2', '3', '4'];
      const frame = mockFrame();
      frame.datasourceLayers[LAYER_ID]!.getTableSpec = () =>
        colIds.map((id) => ({ columnId: id, fields: [] }));

      frame.datasourceLayers[LAYER_ID]!.getOperationForColumnId = (colId) =>
        ({
          label: `Label for ${colId}`,
        } as OperationDescriptor);

      it('applies palette and collapse icons for single slice-by group', () => {
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
                      "triggerIconType": "aggregate",
                    },
                    Object {
                      "columnId": "2",
                      "palette": Array [
                        "red",
                        "black",
                      ],
                      "triggerIconType": "colorBy",
                    },
                    Object {
                      "columnId": "3",
                      "triggerIconType": "aggregate",
                    },
                    Object {
                      "columnId": "4",
                      "triggerIconType": undefined,
                    },
                  ]
              `);
      });

      it('applies palette and collapse icons with multiple slice-by groups (mosaic)', () => {
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
                "triggerIconType": "aggregate",
              },
              Object {
                "columnId": "2",
                "palette": Array [
                  "red",
                  "black",
                ],
                "triggerIconType": "colorBy",
              },
            ],
            Array [
              Object {
                "columnId": "3",
                "triggerIconType": "aggregate",
              },
              Object {
                "columnId": "4",
                "triggerIconType": undefined,
              },
            ],
            Array [],
          ]
        `);
      });

      it('applies color swatch icons with multiple metrics', () => {
        const state = getExampleState();
        state.layers[0].allowMultipleMetrics = true;
        state.layers[0].metrics = colIds;
        state.layers[0].colorsByDimension = {};
        state.layers[0].colorsByDimension[colIds[0]] = 'overridden-color';

        const config = pieVisualization.getConfiguration({
          state,
          frame,
          layerId: state.layers[0].layerId,
        });

        expect(config.groups.map(({ accessors }) => accessors)).toMatchInlineSnapshot(`
          Array [
            Array [],
            Array [
              Object {
                "color": "overridden-color",
                "columnId": "1",
                "triggerIconType": "color",
              },
              Object {
                "color": "black",
                "columnId": "2",
                "triggerIconType": "color",
              },
              Object {
                "color": "black",
                "columnId": "3",
                "triggerIconType": "color",
              },
              Object {
                "color": "black",
                "columnId": "4",
                "triggerIconType": "color",
              },
            ],
          ]
        `);

        const palette = paletteServiceMock.get('default');
        expect((palette.getCategoricalColor as jest.Mock).mock.calls).toMatchInlineSnapshot(`
          Array [
            Array [
              Array [
                Object {
                  "name": "Label for 2",
                  "rankAtDepth": 1,
                  "totalSeriesAtDepth": 4,
                },
              ],
            ],
            Array [
              Array [
                Object {
                  "name": "Label for 3",
                  "rankAtDepth": 2,
                  "totalSeriesAtDepth": 4,
                },
              ],
            ],
            Array [
              Array [
                Object {
                  "name": "Label for 4",
                  "rankAtDepth": 3,
                  "totalSeriesAtDepth": 4,
                },
              ],
            ],
          ]
        `);
      });

      it("applies disabled icons on multiple metrics if there's a slice-by", () => {
        const state = getExampleState();
        state.layers[0].allowMultipleMetrics = true;

        const [first, ...rest] = colIds;

        state.layers[0].primaryGroups = [first];
        state.layers[0].metrics = rest;

        const config = pieVisualization.getConfiguration({
          state,
          frame,
          layerId: state.layers[0].layerId,
        });

        expect(findMetricGroup(config)?.accessors).toMatchInlineSnapshot(`
          Array [
            Object {
              "columnId": "2",
              "triggerIconType": "disabled",
            },
            Object {
              "columnId": "3",
              "triggerIconType": "disabled",
            },
            Object {
              "columnId": "4",
              "triggerIconType": "disabled",
            },
          ]
        `);

        const palette = paletteServiceMock.get('default');
        expect(palette.getCategoricalColor).not.toHaveBeenCalled();
      });
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

      expect(findPrimaryGroup(getConfig(state))?.supportsMoreColumns).toBeFalsy();

      const stateWithCollapsed = cloneDeep(state);
      stateWithCollapsed.layers[0].collapseFns = { '1': 'sum' };

      expect(findPrimaryGroup(getConfig(stateWithCollapsed))?.supportsMoreColumns).toBeTruthy();
    });

    it('counts multiple metrics toward the dimension limits when not mosaic', () => {
      const colIds = new Array(PartitionChartsMeta.pie.maxBuckets - 1)
        .fill(undefined)
        .map((_, i) => String(i + 1));

      const frame = mockFrame();
      frame.datasourceLayers[LAYER_ID]!.getTableSpec = () =>
        colIds.map((id) => ({ columnId: id, fields: [] }));

      const state = getExampleState();
      state.layers[0].primaryGroups = colIds;
      state.layers[0].allowMultipleMetrics = true;

      const getConfig = (_state: PieVisualizationState) =>
        pieVisualization.getConfiguration({
          state: _state,
          frame,
          layerId: state.layers[0].layerId,
        });

      expect(findPrimaryGroup(getConfig(state))?.supportsMoreColumns).toBeTruthy();

      const stateWithMultipleMetrics = cloneDeep(state);
      stateWithMultipleMetrics.layers[0].metrics.push('1', '2');

      expect(
        findPrimaryGroup(getConfig(stateWithMultipleMetrics))?.supportsMoreColumns
      ).toBeFalsy();
    });

    it('does NOT count multiple metrics toward the dimension limits when mosaic', () => {
      const frame = mockFrame();
      frame.datasourceLayers[LAYER_ID]!.getTableSpec = () => [];

      const state = getExampleState();
      state.shape = 'mosaic';
      state.layers[0].primaryGroups = [];
      state.layers[0].allowMultipleMetrics = false; // always true for mosaic

      const getConfig = (_state: PieVisualizationState) =>
        pieVisualization.getConfiguration({
          state: _state,
          frame,
          layerId: state.layers[0].layerId,
        });

      expect(findPrimaryGroup(getConfig(state))?.supportsMoreColumns).toBeTruthy();

      const stateWithMultipleMetrics = cloneDeep(state);
      stateWithMultipleMetrics.layers[0].metrics.push('1', '2');

      expect(
        findPrimaryGroup(getConfig(stateWithMultipleMetrics))?.supportsMoreColumns
      ).toBeTruthy();
    });

    it('reports too many metric dimensions if multiple not enabled', () => {
      const colIds = ['1', '2', '3', '4'];

      const frame = mockFrame();
      frame.datasourceLayers[LAYER_ID]!.getTableSpec = () =>
        colIds.map((id) => ({ columnId: id, fields: [] }));

      const state = getExampleState();
      state.layers[0].metrics = colIds;
      state.layers[0].allowMultipleMetrics = false;
      expect(
        findMetricGroup(
          pieVisualization.getConfiguration({
            state,
            frame,
            layerId: state.layers[0].layerId,
          })
        )?.dimensionsTooMany
      ).toBe(3);

      state.layers[0].allowMultipleMetrics = true;
      expect(
        findMetricGroup(
          pieVisualization.getConfiguration({
            state,
            frame,
            layerId: state.layers[0].layerId,
          })
        )?.dimensionsTooMany
      ).toBe(0);
    });

    it.each(Object.values(PieChartTypes).filter((type) => type !== 'mosaic'))(
      '%s adds fake dimension',
      (type) => {
        const state = { ...getExampleState(), type };
        state.layers[0].metrics.push('1', '2');
        state.layers[0].allowMultipleMetrics = true;
        expect(
          findPrimaryGroup(
            pieVisualization.getConfiguration({
              state,
              frame: mockFrame(),
              layerId: state.layers[0].layerId,
            })
          )?.fakeFinalAccessor
        ).toEqual({ label: '2 metrics' });

        // but not when multiple metrics aren't allowed
        state.layers[0].allowMultipleMetrics = false;
        expect(
          pieVisualization.getConfiguration({
            state,
            frame: mockFrame(),
            layerId: state.layers[0].layerId,
          }).groups[1].fakeFinalAccessor
        ).toBeUndefined();
      }
    );
  });
});
