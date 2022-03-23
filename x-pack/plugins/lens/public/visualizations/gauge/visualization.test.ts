/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getGaugeVisualization, isNumericDynamicMetric, isNumericMetric } from './visualization';
import { createMockDatasource, createMockFramePublicAPI } from '../../mocks';
import { GROUP_ID } from './constants';
import type { DatasourcePublicAPI, OperationDescriptor } from '../../types';
import { chartPluginMock } from 'src/plugins/charts/public/mocks';
import { CustomPaletteParams, layerTypes } from '../../../common';
import type { GaugeVisualizationState } from './constants';
import { PaletteOutput } from 'src/plugins/charts/common';

function exampleState(): GaugeVisualizationState {
  return {
    layerId: 'test-layer',
    layerType: layerTypes.DATA,
    labelMajorMode: 'auto',
    ticksPosition: 'auto',
    shape: 'horizontalBullet',
  };
}

const paletteService = chartPluginMock.createPaletteRegistry();

describe('gauge', () => {
  let frame: ReturnType<typeof createMockFramePublicAPI>;

  beforeEach(() => {
    frame = createMockFramePublicAPI();
  });

  describe('#intialize', () => {
    test('returns a default state', () => {
      expect(getGaugeVisualization({ paletteService }).initialize(() => 'l1')).toEqual({
        layerId: 'l1',
        layerType: layerTypes.DATA,
        shape: 'horizontalBullet',
        labelMajorMode: 'auto',
        ticksPosition: 'auto',
      });
    });

    test('returns persisted state', () => {
      expect(
        getGaugeVisualization({ paletteService }).initialize(() => 'test-layer', exampleState())
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
      const state: GaugeVisualizationState = {
        ...exampleState(),
        layerId: 'first',
        metricAccessor: 'metric-accessor',
        minAccessor: 'min-accessor',
        maxAccessor: 'max-accessor',
        goalAccessor: 'goal-accessor',
      };
      frame.activeData = {
        first: { type: 'datatable', columns: [], rows: [{ 'metric-accessor': 200 }] },
      };

      expect(
        getGaugeVisualization({
          paletteService,
        }).getConfiguration({ state, frame, layerId: 'first' })
      ).toEqual({
        groups: [
          {
            layerId: 'first',
            groupId: GROUP_ID.METRIC,
            groupLabel: 'Metric',
            accessors: [{ columnId: 'metric-accessor', triggerIcon: 'none' }],
            filterOperations: isNumericDynamicMetric,
            supportsMoreColumns: false,
            required: true,
            dataTestSubj: 'lnsGauge_metricDimensionPanel',
            enableDimensionEditor: true,
            supportFieldFormat: true,
          },
          {
            layerId: 'first',
            groupId: GROUP_ID.MIN,
            groupLabel: 'Minimum value',
            accessors: [{ columnId: 'min-accessor' }],
            filterOperations: isNumericMetric,
            supportsMoreColumns: false,
            dataTestSubj: 'lnsGauge_minDimensionPanel',
            prioritizedOperation: 'min',
            suggestedValue: expect.any(Function),
            supportFieldFormat: false,
            supportStaticValue: true,
          },
          {
            layerId: 'first',
            groupId: GROUP_ID.MAX,
            groupLabel: 'Maximum value',
            accessors: [{ columnId: 'max-accessor' }],
            filterOperations: isNumericMetric,
            supportsMoreColumns: false,
            dataTestSubj: 'lnsGauge_maxDimensionPanel',
            prioritizedOperation: 'max',
            suggestedValue: expect.any(Function),
            supportFieldFormat: false,
            supportStaticValue: true,
          },
          {
            layerId: 'first',
            groupId: GROUP_ID.GOAL,
            groupLabel: 'Goal value',
            accessors: [{ columnId: 'goal-accessor' }],
            filterOperations: isNumericMetric,
            supportsMoreColumns: false,
            required: false,
            dataTestSubj: 'lnsGauge_goalDimensionPanel',
            supportFieldFormat: false,
            supportStaticValue: true,
          },
        ],
      });
    });

    test('resolves configuration from partial state', () => {
      const state: GaugeVisualizationState = {
        ...exampleState(),
        layerId: 'first',
        minAccessor: 'min-accessor',
      };
      expect(
        getGaugeVisualization({
          paletteService,
        }).getConfiguration({ state, frame, layerId: 'first' })
      ).toEqual({
        groups: [
          {
            layerId: 'first',
            groupId: GROUP_ID.METRIC,
            groupLabel: 'Metric',
            accessors: [],
            filterOperations: isNumericDynamicMetric,
            supportsMoreColumns: true,
            required: true,
            dataTestSubj: 'lnsGauge_metricDimensionPanel',
            enableDimensionEditor: true,
            supportFieldFormat: true,
          },
          {
            layerId: 'first',
            groupId: GROUP_ID.MIN,
            groupLabel: 'Minimum value',
            accessors: [{ columnId: 'min-accessor' }],
            filterOperations: isNumericMetric,
            supportsMoreColumns: false,
            dataTestSubj: 'lnsGauge_minDimensionPanel',
            prioritizedOperation: 'min',
            suggestedValue: expect.any(Function),
            supportFieldFormat: false,
            supportStaticValue: true,
          },
          {
            layerId: 'first',
            groupId: GROUP_ID.MAX,
            groupLabel: 'Maximum value',
            accessors: [],
            filterOperations: isNumericMetric,
            supportsMoreColumns: true,
            dataTestSubj: 'lnsGauge_maxDimensionPanel',
            prioritizedOperation: 'max',
            suggestedValue: expect.any(Function),
            supportFieldFormat: false,
            supportStaticValue: true,
          },
          {
            layerId: 'first',
            groupId: GROUP_ID.GOAL,
            groupLabel: 'Goal value',
            accessors: [],
            filterOperations: isNumericMetric,
            supportsMoreColumns: true,
            required: false,
            dataTestSubj: 'lnsGauge_goalDimensionPanel',
            supportFieldFormat: false,
            supportStaticValue: true,
          },
        ],
      });
    });

    test("resolves configuration when there's no access to active data in frame", () => {
      const state: GaugeVisualizationState = {
        ...exampleState(),
        layerId: 'first',
        metricAccessor: 'metric-accessor',
        minAccessor: 'min-accessor',
        maxAccessor: 'max-accessor',
        goalAccessor: 'goal-accessor',
      };

      frame.activeData = undefined;

      expect(
        getGaugeVisualization({
          paletteService,
        }).getConfiguration({ state, frame, layerId: 'first' })
      ).toEqual({
        groups: [
          {
            layerId: 'first',
            groupId: GROUP_ID.METRIC,
            groupLabel: 'Metric',
            accessors: [{ columnId: 'metric-accessor', triggerIcon: 'none' }],
            filterOperations: isNumericDynamicMetric,
            supportsMoreColumns: false,
            required: true,
            dataTestSubj: 'lnsGauge_metricDimensionPanel',
            enableDimensionEditor: true,
            supportFieldFormat: true,
          },
          {
            layerId: 'first',
            groupId: GROUP_ID.MIN,
            groupLabel: 'Minimum value',
            accessors: [{ columnId: 'min-accessor' }],
            filterOperations: isNumericMetric,
            supportsMoreColumns: false,
            dataTestSubj: 'lnsGauge_minDimensionPanel',
            prioritizedOperation: 'min',
            suggestedValue: expect.any(Function),
            supportFieldFormat: false,
            supportStaticValue: true,
          },
          {
            layerId: 'first',
            groupId: GROUP_ID.MAX,
            groupLabel: 'Maximum value',
            accessors: [{ columnId: 'max-accessor' }],
            filterOperations: isNumericMetric,
            supportsMoreColumns: false,
            dataTestSubj: 'lnsGauge_maxDimensionPanel',
            prioritizedOperation: 'max',
            suggestedValue: expect.any(Function),
            supportFieldFormat: false,
            supportStaticValue: true,
          },
          {
            layerId: 'first',
            groupId: GROUP_ID.GOAL,
            groupLabel: 'Goal value',
            accessors: [{ columnId: 'goal-accessor' }],
            filterOperations: isNumericMetric,
            supportsMoreColumns: false,
            required: false,
            dataTestSubj: 'lnsGauge_goalDimensionPanel',
            supportFieldFormat: false,
            supportStaticValue: true,
          },
        ],
      });
    });

    test('resolves configuration when with group error when max < minimum', () => {
      const state: GaugeVisualizationState = {
        ...exampleState(),
        layerId: 'first',
        metricAccessor: 'metric-accessor',
        minAccessor: 'min-accessor',
        maxAccessor: 'max-accessor',
        goalAccessor: 'goal-accessor',
      };
      frame.activeData = {
        first: {
          type: 'datatable',
          columns: [],
          rows: [{ 'min-accessor': 10, 'max-accessor': 0 }],
        },
      };

      expect(
        getGaugeVisualization({
          paletteService,
        }).getConfiguration({ state, frame, layerId: 'first' })
      ).toEqual({
        groups: [
          {
            layerId: 'first',
            groupId: GROUP_ID.METRIC,
            groupLabel: 'Metric',
            accessors: [{ columnId: 'metric-accessor', triggerIcon: 'none' }],
            filterOperations: isNumericDynamicMetric,
            supportsMoreColumns: false,
            required: true,
            dataTestSubj: 'lnsGauge_metricDimensionPanel',
            enableDimensionEditor: true,
            supportFieldFormat: true,
          },
          {
            layerId: 'first',
            groupId: GROUP_ID.MIN,
            groupLabel: 'Minimum value',
            accessors: [{ columnId: 'min-accessor' }],
            filterOperations: isNumericMetric,
            supportsMoreColumns: false,
            dataTestSubj: 'lnsGauge_minDimensionPanel',
            prioritizedOperation: 'min',
            suggestedValue: expect.any(Function),
            supportFieldFormat: false,
            supportStaticValue: true,
            invalid: true,
            invalidMessage: 'Minimum value may not be greater than maximum value',
          },
          {
            layerId: 'first',
            groupId: GROUP_ID.MAX,
            groupLabel: 'Maximum value',
            accessors: [{ columnId: 'max-accessor' }],
            filterOperations: isNumericMetric,
            supportsMoreColumns: false,
            dataTestSubj: 'lnsGauge_maxDimensionPanel',
            prioritizedOperation: 'max',
            suggestedValue: expect.any(Function),
            supportFieldFormat: false,
            supportStaticValue: true,
            invalid: true,
            invalidMessage: 'Minimum value may not be greater than maximum value',
          },
          {
            layerId: 'first',
            groupId: GROUP_ID.GOAL,
            groupLabel: 'Goal value',
            accessors: [{ columnId: 'goal-accessor' }],
            filterOperations: isNumericMetric,
            supportsMoreColumns: false,
            required: false,
            dataTestSubj: 'lnsGauge_goalDimensionPanel',
            supportFieldFormat: false,
            supportStaticValue: true,
          },
        ],
      });
    });
  });

  describe('#setDimension', () => {
    test('set dimension correctly', () => {
      const prevState: GaugeVisualizationState = {
        ...exampleState(),
        minAccessor: 'min-accessor',
        maxAccessor: 'max-accessor',
      };
      expect(
        getGaugeVisualization({
          paletteService,
        }).setDimension({
          prevState,
          layerId: 'first',
          columnId: 'new-min-accessor',
          groupId: 'min',
          frame,
        })
      ).toEqual({
        ...prevState,
        minAccessor: 'new-min-accessor',
      });
    });
  });

  describe('#removeDimension', () => {
    const prevState: GaugeVisualizationState = {
      ...exampleState(),
      metricAccessor: 'metric-accessor',
      minAccessor: 'min-accessor',
      palette: [] as unknown as PaletteOutput<CustomPaletteParams>,
      colorMode: 'palette',
      ticksPosition: 'bands',
    };
    test('removes metric correctly', () => {
      expect(
        getGaugeVisualization({
          paletteService,
        }).removeDimension({
          prevState,
          layerId: 'first',
          columnId: 'metric-accessor',
          frame,
        })
      ).toEqual({
        ...exampleState(),
        minAccessor: 'min-accessor',
      });
    });
    test('removes min correctly', () => {
      expect(
        getGaugeVisualization({
          paletteService,
        }).removeDimension({
          prevState,
          layerId: 'first',
          columnId: 'min-accessor',
          frame,
        })
      ).toEqual({
        ...exampleState(),
        metricAccessor: 'metric-accessor',
        palette: [] as unknown as PaletteOutput<CustomPaletteParams>,
        colorMode: 'palette',
        ticksPosition: 'bands',
      });
    });
  });
  describe('#getSupportedLayers', () => {
    it('should return a single layer type', () => {
      expect(
        getGaugeVisualization({
          paletteService,
        }).getSupportedLayers()
      ).toHaveLength(1);
    });
  });
  describe('#getLayerType', () => {
    it('should return the type only if the layer is in the state', () => {
      const state: GaugeVisualizationState = {
        ...exampleState(),
        minAccessor: 'min-accessor',
        goalAccessor: 'value-accessor',
      };
      const instance = getGaugeVisualization({
        paletteService,
      });
      expect(instance.getLayerType('test-layer', state)).toEqual(layerTypes.DATA);
      expect(instance.getLayerType('foo', state)).toBeUndefined();
    });
  });

  describe('#toExpression', () => {
    let datasourceLayers: Record<string, DatasourcePublicAPI>;
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
      const state: GaugeVisualizationState = {
        ...exampleState(),
        layerId: 'first',
        minAccessor: 'min-accessor',
        goalAccessor: 'goal-accessor',
        metricAccessor: 'metric-accessor',
        maxAccessor: 'max-accessor',
        labelMinor: 'Subtitle',
      };
      expect(
        getGaugeVisualization({
          paletteService,
        }).toExpression(state, datasourceLayers)
      ).toEqual({
        type: 'expression',
        chain: [
          {
            type: 'function',
            function: 'gauge',
            arguments: {
              metric: ['metric-accessor'],
              min: ['min-accessor'],
              max: ['max-accessor'],
              goal: ['goal-accessor'],
              colorMode: ['none'],
              ticksPosition: ['auto'],
              labelMajorMode: ['auto'],
              labelMinor: ['Subtitle'],
              labelMajor: [],
              palette: [],
              shape: ['horizontalBullet'],
            },
          },
        ],
      });
    });
    test('returns null with a missing metric accessor', () => {
      const state: GaugeVisualizationState = {
        ...exampleState(),
        layerId: 'first',
        minAccessor: 'min-accessor',
      };
      expect(
        getGaugeVisualization({
          paletteService,
        }).toExpression(state, datasourceLayers)
      ).toEqual(null);
    });
  });

  describe('#getErrorMessages', () => {
    it('returns undefined if no error is raised', () => {
      const error = getGaugeVisualization({
        paletteService,
      }).getErrorMessages(exampleState());
      expect(error).not.toBeDefined();
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
    const state: GaugeVisualizationState = {
      ...exampleState(),
      layerId: 'first',
      metricAccessor: 'metric-accessor',
      minAccessor: 'min-accessor',
      maxAccessor: 'max-accessor',
      goalAccessor: 'goal-accessor',
    };
    it('should not warn for data in bounds', () => {
      frame.activeData = {
        first: {
          type: 'datatable',
          columns: [],
          rows: [
            {
              'min-accessor': 0,
              'metric-accessor': 5,
              'max-accessor': 10,
              'goal-accessor': 8,
            },
          ],
        },
      };

      expect(
        getGaugeVisualization({
          paletteService,
        }).getWarningMessages!(state, frame)
      ).toHaveLength(0);
    });
    it('should warn when minimum value is greater than metric value', () => {
      frame.activeData = {
        first: {
          type: 'datatable',
          columns: [],
          rows: [
            {
              'metric-accessor': -1,
              'min-accessor': 1,
              'max-accessor': 3,
              'goal-accessor': 2,
            },
          ],
        },
      };

      expect(
        getGaugeVisualization({
          paletteService,
        }).getWarningMessages!(state, frame)
      ).toHaveLength(1);
    });

    it('should warn when metric value is greater than maximum value', () => {
      frame.activeData = {
        first: {
          type: 'datatable',
          columns: [],
          rows: [
            {
              'metric-accessor': 10,
              'min-accessor': -10,
              'max-accessor': 0,
            },
          ],
        },
      };

      expect(
        getGaugeVisualization({
          paletteService,
        }).getWarningMessages!(state, frame)
      ).toHaveLength(1);
    });
    it('should warn when goal value is greater than maximum value', () => {
      frame.activeData = {
        first: {
          type: 'datatable',
          columns: [],
          rows: [
            {
              'metric-accessor': 5,
              'min-accessor': 0,
              'max-accessor': 10,
              'goal-accessor': 15,
            },
          ],
        },
      };

      expect(
        getGaugeVisualization({
          paletteService,
        }).getWarningMessages!(state, frame)
      ).toHaveLength(1);
    });
    it('should warn when minimum value is greater than goal value', () => {
      frame.activeData = {
        first: {
          type: 'datatable',
          columns: [],
          rows: [
            {
              'metric-accessor': 5,
              'min-accessor': 0,
              'max-accessor': 10,
              'goal-accessor': -5,
            },
          ],
        },
      };

      expect(
        getGaugeVisualization({
          paletteService,
        }).getWarningMessages!(state, frame)
      ).toHaveLength(1);
    });
  });
});
