/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  filterOperationsAxis,
  getHeatmapVisualization,
  isCellValueSupported,
} from './visualization';
import { createMockDatasource, createMockFramePublicAPI } from '../mocks';
import {
  CHART_SHAPES,
  FUNCTION_NAME,
  GROUP_ID,
  HEATMAP_GRID_FUNCTION,
  LEGEND_FUNCTION,
} from './constants';
import { Position } from '@elastic/charts';
import type { HeatmapVisualizationState } from './types';
import type { DatasourceLayers, OperationDescriptor } from '../types';
import { chartPluginMock } from 'src/plugins/charts/public/mocks';
import { layerTypes } from '../../common';
import { themeServiceMock } from '../../../../../src/core/public/mocks';

function exampleState(): HeatmapVisualizationState {
  return {
    layerId: 'test-layer',
    layerType: layerTypes.DATA,
    legend: {
      isVisible: true,
      position: Position.Right,
      type: LEGEND_FUNCTION,
      maxLines: 1,
      shouldTruncate: true,
    },
    gridConfig: {
      type: HEATMAP_GRID_FUNCTION,
      isCellLabelVisible: false,
      isYAxisLabelVisible: true,
      isXAxisLabelVisible: true,
      isYAxisTitleVisible: true,
      isXAxisTitleVisible: true,
    },
    shape: CHART_SHAPES.HEATMAP,
  };
}

const paletteService = chartPluginMock.createPaletteRegistry();
const theme = themeServiceMock.createStartContract();

describe('heatmap', () => {
  let frame: ReturnType<typeof createMockFramePublicAPI>;

  beforeEach(() => {
    frame = createMockFramePublicAPI();
  });

  describe('#intialize', () => {
    test('returns a default state', () => {
      expect(getHeatmapVisualization({ paletteService, theme }).initialize(() => 'l1')).toEqual({
        layerId: 'l1',
        layerType: layerTypes.DATA,
        title: 'Empty Heatmap chart',
        shape: CHART_SHAPES.HEATMAP,
        legend: {
          isVisible: true,
          position: Position.Right,
          type: LEGEND_FUNCTION,
          maxLines: 1,
        },
        gridConfig: {
          type: HEATMAP_GRID_FUNCTION,
          isCellLabelVisible: false,
          isYAxisLabelVisible: true,
          isXAxisLabelVisible: true,
          isYAxisTitleVisible: true,
          isXAxisTitleVisible: true,
        },
      });
    });

    test('returns persisted state', () => {
      expect(
        getHeatmapVisualization({ paletteService, theme }).initialize(
          () => 'test-layer',
          exampleState()
        )
      ).toEqual(exampleState());
    });
  });

  describe('#getConfiguration', () => {
    beforeEach(() => {
      const mockDatasource = createMockDatasource('testDatasource');

      mockDatasource.publicAPIMock.getOperationForColumnId.mockReturnValue({
        dataType: 'string',
        label: 'MyOperation',
      } as OperationDescriptor);

      frame.datasourceLayers = {
        first: mockDatasource.publicAPIMock,
      };
    });

    afterEach(() => {
      // some tests manipulate it, so restore a pristine version
      frame = createMockFramePublicAPI();
    });

    test('resolves configuration from complete state and available data', () => {
      const state: HeatmapVisualizationState = {
        ...exampleState(),
        layerId: 'first',
        xAccessor: 'x-accessor',
        yAccessor: 'y-accessor',
        valueAccessor: 'v-accessor',
      };

      frame.activeData = { first: { type: 'datatable', columns: [], rows: [] } };

      expect(
        getHeatmapVisualization({
          paletteService,
          theme,
        }).getConfiguration({ state, frame, layerId: 'first' })
      ).toEqual({
        groups: [
          {
            layerId: 'first',
            groupId: GROUP_ID.X,
            groupLabel: 'Horizontal axis',
            accessors: [{ columnId: 'x-accessor' }],
            filterOperations: filterOperationsAxis,
            supportsMoreColumns: false,
            required: true,
            dataTestSubj: 'lnsHeatmap_xDimensionPanel',
          },
          {
            layerId: 'first',
            groupId: GROUP_ID.Y,
            groupLabel: 'Vertical axis',
            accessors: [{ columnId: 'y-accessor' }],
            filterOperations: filterOperationsAxis,
            supportsMoreColumns: false,
            required: false,
            dataTestSubj: 'lnsHeatmap_yDimensionPanel',
          },
          {
            layerId: 'first',
            groupId: GROUP_ID.CELL,
            groupLabel: 'Cell value',
            accessors: [
              {
                columnId: 'v-accessor',
                triggerIcon: 'colorBy',
                palette: ['blue', 'yellow'],
              },
            ],
            filterOperations: isCellValueSupported,
            supportsMoreColumns: false,
            required: true,
            dataTestSubj: 'lnsHeatmap_cellPanel',
            enableDimensionEditor: true,
          },
        ],
      });
    });

    test('resolves configuration from partial state', () => {
      const state: HeatmapVisualizationState = {
        ...exampleState(),
        layerId: 'first',
        xAccessor: 'x-accessor',
      };

      expect(
        getHeatmapVisualization({
          paletteService,
          theme,
        }).getConfiguration({ state, frame, layerId: 'first' })
      ).toEqual({
        groups: [
          {
            layerId: 'first',
            groupId: GROUP_ID.X,
            groupLabel: 'Horizontal axis',
            accessors: [{ columnId: 'x-accessor' }],
            filterOperations: filterOperationsAxis,
            supportsMoreColumns: false,
            required: true,
            dataTestSubj: 'lnsHeatmap_xDimensionPanel',
          },
          {
            layerId: 'first',
            groupId: GROUP_ID.Y,
            groupLabel: 'Vertical axis',
            accessors: [],
            filterOperations: filterOperationsAxis,
            supportsMoreColumns: true,
            required: false,
            dataTestSubj: 'lnsHeatmap_yDimensionPanel',
          },
          {
            layerId: 'first',
            groupId: GROUP_ID.CELL,
            groupLabel: 'Cell value',
            accessors: [],
            filterOperations: isCellValueSupported,
            supportsMoreColumns: true,
            required: true,
            dataTestSubj: 'lnsHeatmap_cellPanel',
            enableDimensionEditor: true,
          },
        ],
      });
    });

    test("resolves configuration when there's no access to active data in frame", () => {
      const state: HeatmapVisualizationState = {
        ...exampleState(),
        layerId: 'first',
        xAccessor: 'x-accessor',
        yAccessor: 'y-accessor',
        valueAccessor: 'v-accessor',
      };

      frame.activeData = undefined;

      expect(
        getHeatmapVisualization({
          paletteService,
          theme,
        }).getConfiguration({ state, frame, layerId: 'first' })
      ).toEqual({
        groups: [
          {
            layerId: 'first',
            groupId: GROUP_ID.X,
            groupLabel: 'Horizontal axis',
            accessors: [{ columnId: 'x-accessor' }],
            filterOperations: filterOperationsAxis,
            supportsMoreColumns: false,
            required: true,
            dataTestSubj: 'lnsHeatmap_xDimensionPanel',
          },
          {
            layerId: 'first',
            groupId: GROUP_ID.Y,
            groupLabel: 'Vertical axis',
            accessors: [{ columnId: 'y-accessor' }],
            filterOperations: filterOperationsAxis,
            supportsMoreColumns: false,
            required: false,
            dataTestSubj: 'lnsHeatmap_yDimensionPanel',
          },
          {
            layerId: 'first',
            groupId: GROUP_ID.CELL,
            groupLabel: 'Cell value',
            accessors: [
              {
                columnId: 'v-accessor',
                triggerIcon: 'none',
              },
            ],
            filterOperations: isCellValueSupported,
            supportsMoreColumns: false,
            required: true,
            dataTestSubj: 'lnsHeatmap_cellPanel',
            enableDimensionEditor: true,
          },
        ],
      });
    });
  });

  describe('#setDimension', () => {
    test('set dimension correctly', () => {
      const prevState: HeatmapVisualizationState = {
        ...exampleState(),
        xAccessor: 'x-accessor',
        yAccessor: 'y-accessor',
      };
      expect(
        getHeatmapVisualization({
          paletteService,
          theme,
        }).setDimension({
          prevState,
          layerId: 'first',
          columnId: 'new-x-accessor',
          groupId: 'x',
          frame,
        })
      ).toEqual({
        ...prevState,
        xAccessor: 'new-x-accessor',
      });
    });
  });

  describe('#removeDimension', () => {
    test('removes dimension correctly', () => {
      const prevState: HeatmapVisualizationState = {
        ...exampleState(),
        xAccessor: 'x-accessor',
        yAccessor: 'y-accessor',
      };
      expect(
        getHeatmapVisualization({
          paletteService,
          theme,
        }).removeDimension({
          prevState,
          layerId: 'first',
          columnId: 'x-accessor',
          frame,
        })
      ).toEqual({
        ...exampleState(),
        yAccessor: 'y-accessor',
      });
    });
  });

  describe('#getSupportedLayers', () => {
    it('should return a single layer type', () => {
      expect(
        getHeatmapVisualization({
          paletteService,
          theme,
        }).getSupportedLayers()
      ).toHaveLength(1);
    });
  });

  describe('#getLayerType', () => {
    it('should return the type only if the layer is in the state', () => {
      const state: HeatmapVisualizationState = {
        ...exampleState(),
        xAccessor: 'x-accessor',
        valueAccessor: 'value-accessor',
      };
      const instance = getHeatmapVisualization({
        paletteService,
        theme,
      });
      expect(instance.getLayerType('test-layer', state)).toEqual(layerTypes.DATA);
      expect(instance.getLayerType('foo', state)).toBeUndefined();
    });
  });

  describe('#toExpression', () => {
    let datasourceLayers: DatasourceLayers;

    beforeEach(() => {
      const mockDatasource = createMockDatasource('testDatasource');

      mockDatasource.publicAPIMock.getOperationForColumnId.mockReturnValue({
        dataType: 'string',
        label: 'MyOperation',
      } as OperationDescriptor);

      datasourceLayers = {
        first: mockDatasource.publicAPIMock,
      };
    });

    test('creates an expression based on state and attributes', () => {
      const state: HeatmapVisualizationState = {
        ...exampleState(),
        layerId: 'first',
        xAccessor: 'x-accessor',
        valueAccessor: 'value-accessor',
      };

      expect(
        getHeatmapVisualization({
          paletteService,
          theme,
        }).toExpression(state, datasourceLayers)
      ).toEqual({
        type: 'expression',
        chain: [
          {
            type: 'function',
            function: FUNCTION_NAME,
            arguments: {
              xAccessor: ['x-accessor'],
              yAccessor: [''],
              valueAccessor: ['value-accessor'],
              palette: [
                {
                  type: 'expression',
                  chain: [
                    {
                      arguments: {
                        name: ['mocked'],
                      },
                      type: 'function',
                      function: 'system_palette',
                    },
                  ],
                },
              ],
              lastRangeIsRightOpen: [true],
              legend: [
                {
                  type: 'expression',
                  chain: [
                    {
                      type: 'function',
                      function: LEGEND_FUNCTION,
                      arguments: {
                        isVisible: [true],
                        position: [Position.Right],
                        legendSize: [],
                      },
                    },
                  ],
                },
              ],
              gridConfig: [
                {
                  type: 'expression',
                  chain: [
                    {
                      type: 'function',
                      function: HEATMAP_GRID_FUNCTION,
                      arguments: {
                        // grid
                        strokeWidth: [],
                        strokeColor: [],
                        xTitle: [],
                        yTitle: [],
                        // cells
                        isCellLabelVisible: [false],
                        // Y-axis
                        isYAxisLabelVisible: [true],
                        isYAxisTitleVisible: [true],
                        // X-axis
                        isXAxisLabelVisible: [true],
                        isXAxisTitleVisible: [true],
                      },
                    },
                  ],
                },
              ],
            },
          },
        ],
      });
    });

    test('returns null with a missing value accessor', () => {
      const state: HeatmapVisualizationState = {
        ...exampleState(),
        layerId: 'first',
        xAccessor: 'x-accessor',
      };
      const attributes = {
        title: 'Test',
      };

      expect(
        getHeatmapVisualization({
          paletteService,
          theme,
        }).toExpression(state, datasourceLayers, attributes)
      ).toEqual(null);
    });
  });

  describe('#toPreviewExpression', () => {
    let datasourceLayers: DatasourceLayers;

    beforeEach(() => {
      const mockDatasource = createMockDatasource('testDatasource');

      mockDatasource.publicAPIMock.getOperationForColumnId.mockReturnValue({
        dataType: 'string',
        label: 'MyOperation',
      } as OperationDescriptor);

      datasourceLayers = {
        first: mockDatasource.publicAPIMock,
      };
    });

    test('creates a preview expression based on state and attributes', () => {
      const state: HeatmapVisualizationState = {
        ...exampleState(),
        layerId: 'first',
        xAccessor: 'x-accessor',
      };

      expect(
        getHeatmapVisualization({
          paletteService,
          theme,
        }).toPreviewExpression!(state, datasourceLayers)
      ).toEqual({
        type: 'expression',
        chain: [
          {
            type: 'function',
            function: FUNCTION_NAME,
            arguments: {
              xAccessor: ['x-accessor'],
              yAccessor: [''],
              valueAccessor: [''],
              palette: [
                {
                  type: 'expression',
                  chain: [
                    {
                      arguments: {
                        name: ['mocked'],
                      },
                      type: 'function',
                      function: 'system_palette',
                    },
                  ],
                },
              ],
              legend: [
                {
                  type: 'expression',
                  chain: [
                    {
                      type: 'function',
                      function: LEGEND_FUNCTION,
                      arguments: {
                        isVisible: [false],
                        position: [],
                      },
                    },
                  ],
                },
              ],
              gridConfig: [
                {
                  type: 'expression',
                  chain: [
                    {
                      type: 'function',
                      function: HEATMAP_GRID_FUNCTION,
                      arguments: {
                        // grid
                        strokeWidth: [1],
                        // cells
                        isCellLabelVisible: [false],
                        // Y-axis
                        isYAxisLabelVisible: [false],
                        isYAxisTitleVisible: [true],
                        // X-axis
                        isXAxisLabelVisible: [false],
                        isXAxisTitleVisible: [true],
                        xTitle: [''],
                        yTitle: [''],
                      },
                    },
                  ],
                },
              ],
            },
          },
        ],
      });
    });
  });

  describe('#getErrorMessages', () => {
    test('should not return an error when chart has empty configuration', () => {
      const mockState = {
        shape: CHART_SHAPES.HEATMAP,
      } as HeatmapVisualizationState;
      expect(
        getHeatmapVisualization({
          paletteService,
          theme,
        }).getErrorMessages(mockState)
      ).toEqual(undefined);
    });

    test('should return an error when the X accessor is missing', () => {
      const mockState = {
        shape: CHART_SHAPES.HEATMAP,
        valueAccessor: 'v-accessor',
      } as HeatmapVisualizationState;
      expect(
        getHeatmapVisualization({
          paletteService,
          theme,
        }).getErrorMessages(mockState)
      ).toEqual([
        {
          longMessage: 'Configuration for the horizontal axis is missing.',
          shortMessage: 'Missing Horizontal axis.',
        },
      ]);
    });
  });

  describe('#getWarningMessages', () => {
    beforeEach(() => {
      const mockDatasource = createMockDatasource('testDatasource');

      mockDatasource.publicAPIMock.getOperationForColumnId.mockReturnValue({
        dataType: 'string',
        label: 'MyOperation',
      } as OperationDescriptor);

      frame.datasourceLayers = {
        first: mockDatasource.publicAPIMock,
      };
    });

    test('should not return warning messages when the layer it not configured', () => {
      const mockState = {
        shape: CHART_SHAPES.HEATMAP,
        valueAccessor: 'v-accessor',
      } as HeatmapVisualizationState;
      expect(
        getHeatmapVisualization({
          paletteService,
          theme,
        }).getWarningMessages!(mockState, frame)
      ).toEqual(undefined);
    });

    test('should not return warning messages when the data table is empty', () => {
      frame.activeData = {
        first: {
          type: 'datatable',
          rows: [],
          columns: [],
        },
      };
      const mockState = {
        shape: CHART_SHAPES.HEATMAP,
        valueAccessor: 'v-accessor',
        layerId: 'first',
      } as HeatmapVisualizationState;
      expect(
        getHeatmapVisualization({
          paletteService,
          theme,
        }).getWarningMessages!(mockState, frame)
      ).toEqual(undefined);
    });

    test('should return a warning message when cell value data contains arrays', () => {
      frame.activeData = {
        first: {
          type: 'datatable',
          rows: [
            {
              'v-accessor': [1, 2, 3],
            },
          ],
          columns: [],
        },
      };

      const mockState = {
        shape: CHART_SHAPES.HEATMAP,
        valueAccessor: 'v-accessor',
        layerId: 'first',
      } as HeatmapVisualizationState;
      expect(
        getHeatmapVisualization({
          paletteService,
          theme,
        }).getWarningMessages!(mockState, frame)
      ).toHaveLength(1);
    });
  });
});
