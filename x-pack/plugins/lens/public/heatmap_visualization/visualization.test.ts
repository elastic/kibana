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
import { createMockDatasource, createMockFramePublicAPI } from '../editor_frame_service/mocks';
import {
  CHART_SHAPES,
  FUNCTION_NAME,
  GROUP_ID,
  HEATMAP_GRID_FUNCTION,
  LEGEND_FUNCTION,
} from './constants';
import { Position } from '@elastic/charts';
import { HeatmapVisualizationState } from './types';
import { DatasourcePublicAPI, Operation } from '../types';

function exampleState(): HeatmapVisualizationState {
  return {
    layerId: 'test-layer',
    legend: {
      isVisible: true,
      position: Position.Right,
      type: LEGEND_FUNCTION,
    },
    gridConfig: {
      type: HEATMAP_GRID_FUNCTION,
      isCellLabelVisible: false,
      isYAxisLabelVisible: true,
      isXAxisLabelVisible: true,
    },
    shape: CHART_SHAPES.HEATMAP,
  };
}

describe('heatmap', () => {
  let frame: ReturnType<typeof createMockFramePublicAPI>;

  beforeEach(() => {
    frame = createMockFramePublicAPI();
  });

  describe('#intialize', () => {
    test('returns a default state', () => {
      expect(getHeatmapVisualization({}).initialize(frame)).toEqual({
        layerId: '',
        title: 'Empty Heatmap chart',
        shape: CHART_SHAPES.HEATMAP,
        legend: {
          isVisible: true,
          position: Position.Right,
          type: LEGEND_FUNCTION,
        },
        gridConfig: {
          type: HEATMAP_GRID_FUNCTION,
          isCellLabelVisible: false,
          isYAxisLabelVisible: true,
          isXAxisLabelVisible: true,
        },
      });
    });

    test('returns persisted state', () => {
      expect(getHeatmapVisualization({}).initialize(frame, exampleState())).toEqual(exampleState());
    });
  });

  describe('#getConfiguration', () => {
    beforeEach(() => {
      const mockDatasource = createMockDatasource('testDatasource');

      mockDatasource.publicAPIMock.getOperationForColumnId.mockReturnValue({
        dataType: 'string',
        label: 'MyOperation',
      } as Operation);

      frame.datasourceLayers = {
        first: mockDatasource.publicAPIMock,
      };
    });

    test('resolves configuration from complete state', () => {
      const state: HeatmapVisualizationState = {
        ...exampleState(),
        layerId: 'first',
        xAccessor: 'x-accessor',
        yAccessor: 'y-accessor',
        valueAccessor: 'v-accessor',
      };

      expect(
        getHeatmapVisualization({}).getConfiguration({ state, frame, layerId: 'first' })
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
            accessors: [{ columnId: 'v-accessor' }],
            filterOperations: isCellValueSupported,
            supportsMoreColumns: false,
            required: true,
            dataTestSubj: 'lnsHeatmap_cellPanel',
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
        getHeatmapVisualization({}).getConfiguration({ state, frame, layerId: 'first' })
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
        getHeatmapVisualization({}).setDimension({
          prevState,
          layerId: 'first',
          columnId: 'new-x-accessor',
          groupId: 'x',
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
        getHeatmapVisualization({}).removeDimension({
          prevState,
          layerId: 'first',
          columnId: 'x-accessor',
        })
      ).toEqual({
        ...exampleState(),
        yAccessor: 'y-accessor',
      });
    });
  });

  describe('#toExpression', () => {
    let datasourceLayers: Record<string, DatasourcePublicAPI>;

    beforeEach(() => {
      const mockDatasource = createMockDatasource('testDatasource');

      mockDatasource.publicAPIMock.getOperationForColumnId.mockReturnValue({
        dataType: 'string',
        label: 'MyOperation',
      } as Operation);

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
      const attributes = {
        title: 'Test',
      };

      expect(getHeatmapVisualization({}).toExpression(state, datasourceLayers, attributes)).toEqual(
        {
          type: 'expression',
          chain: [
            {
              type: 'function',
              function: FUNCTION_NAME,
              arguments: {
                title: ['Test'],
                description: [''],
                xAccessor: ['x-accessor'],
                yAccessor: [''],
                valueAccessor: ['value-accessor'],
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
                          cellHeight: [],
                          cellWidth: [],
                          // cells
                          isCellLabelVisible: [false],
                          // Y-axis
                          isYAxisLabelVisible: [true],
                          yAxisLabelWidth: [],
                          yAxisLabelColor: [],
                          // X-axis
                          isXAxisLabelVisible: [true],
                        },
                      },
                    ],
                  },
                ],
              },
            },
          ],
        }
      );
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

      expect(getHeatmapVisualization({}).toExpression(state, datasourceLayers, attributes)).toEqual(
        null
      );
    });
  });

  describe('#toPreviewExpression', () => {
    let datasourceLayers: Record<string, DatasourcePublicAPI>;

    beforeEach(() => {
      const mockDatasource = createMockDatasource('testDatasource');

      mockDatasource.publicAPIMock.getOperationForColumnId.mockReturnValue({
        dataType: 'string',
        label: 'MyOperation',
      } as Operation);

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

      expect(getHeatmapVisualization({}).toPreviewExpression!(state, datasourceLayers)).toEqual({
        type: 'expression',
        chain: [
          {
            type: 'function',
            function: FUNCTION_NAME,
            arguments: {
              title: [''],
              description: [''],
              xAccessor: ['x-accessor'],
              yAccessor: [''],
              valueAccessor: [''],
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
                        // X-axis
                        isXAxisLabelVisible: [false],
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

  describe('#getErrorMessages', () => {});
});
