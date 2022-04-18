/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSuggestions } from './suggestions';
import { layerTypes } from '../../../common';
import { GaugeShapes } from '@kbn/expression-gauge-plugin/common';
import { GaugeVisualizationState } from './constants';

const metricColumn = {
  columnId: 'metric-column',
  operation: {
    isBucketed: false,
    dataType: 'number' as const,
    scale: 'ratio' as const,
    label: 'Metric',
  },
};

const bucketColumn = {
  columnId: 'date-column-01',
  operation: {
    isBucketed: true,
    dataType: 'date' as const,
    scale: 'interval' as const,
    label: 'Date',
  },
};

describe('gauge suggestions', () => {
  describe('rejects suggestions', () => {
    test('when currently active and unchanged data', () => {
      const unchangedSuggestion = {
        table: {
          layerId: 'first',
          isMultiRow: true,
          columns: [],
          changeType: 'unchanged' as const,
        },
        state: {
          shape: GaugeShapes.HORIZONTAL_BULLET,
          layerId: 'first',
          layerType: layerTypes.DATA,
        } as GaugeVisualizationState,
        keptLayerIds: ['first'],
      };
      expect(getSuggestions(unchangedSuggestion)).toHaveLength(0);
    });
    test('when there are buckets', () => {
      const bucketAndMetricSuggestion = {
        table: {
          layerId: 'first',
          isMultiRow: true,
          columns: [bucketColumn, metricColumn],
          changeType: 'initial' as const,
        },
        state: {
          layerId: 'first',
          layerType: layerTypes.DATA,
        } as GaugeVisualizationState,
        keptLayerIds: ['first'],
      };
      expect(getSuggestions(bucketAndMetricSuggestion)).toEqual([]);
    });
    test('when currently active with partial configuration', () => {
      expect(
        getSuggestions({
          table: {
            layerId: 'first',
            isMultiRow: true,
            columns: [metricColumn],
            changeType: 'initial',
          },
          state: {
            shape: GaugeShapes.HORIZONTAL_BULLET,
            layerId: 'first',
            layerType: layerTypes.DATA,
            minAccessor: 'some-field',
            labelMajorMode: 'auto',
            ticksPosition: 'auto',
          } as GaugeVisualizationState,
          keptLayerIds: ['first'],
        })
      ).toHaveLength(0);
    });
    test('for tables with a single bucket dimension', () => {
      expect(
        getSuggestions({
          table: {
            layerId: 'first',
            isMultiRow: true,
            columns: [bucketColumn],
            changeType: 'reduced',
          },
          state: {
            layerId: 'first',
            layerType: layerTypes.DATA,
          } as GaugeVisualizationState,
          keptLayerIds: ['first'],
        })
      ).toEqual([]);
    });
    test('when two metric accessor are available', () => {
      expect(
        getSuggestions({
          table: {
            layerId: 'first',
            isMultiRow: true,
            columns: [
              metricColumn,
              {
                ...metricColumn,
                columnId: 'metric-column2',
              },
            ],
            changeType: 'initial',
          },
          state: {
            layerId: 'first',
            layerType: layerTypes.DATA,
          } as GaugeVisualizationState,
          keptLayerIds: ['first'],
        })
      ).toEqual([]);
    });
  });
});

describe('shows suggestions', () => {
  test('when complete configuration has been resolved', () => {
    expect(
      getSuggestions({
        table: {
          layerId: 'first',
          isMultiRow: true,
          columns: [metricColumn],
          changeType: 'initial',
        },
        state: {
          layerId: 'first',
          layerType: layerTypes.DATA,
        } as GaugeVisualizationState,
        keptLayerIds: ['first'],
      })
    ).toEqual([
      {
        state: {
          layerId: 'first',
          layerType: layerTypes.DATA,
          shape: GaugeShapes.HORIZONTAL_BULLET,
          metricAccessor: 'metric-column',
          labelMajorMode: 'auto',
          ticksPosition: 'auto',
        },
        title: 'Gauge',
        hide: true,
        previewIcon: 'empty',
        score: 0.5,
      },
      {
        hide: true,
        previewIcon: 'empty',
        title: 'Gauge',
        score: 0.5,
        state: {
          layerId: 'first',
          layerType: 'data',
          metricAccessor: 'metric-column',
          shape: GaugeShapes.VERTICAL_BULLET,
          ticksPosition: 'auto',
          labelMajorMode: 'auto',
        },
      },
    ]);
  });
  test('passes the state when change is shape change', () => {
    expect(
      getSuggestions({
        table: {
          layerId: 'first',
          isMultiRow: true,
          columns: [metricColumn],
          changeType: 'extended',
        },
        state: {
          layerId: 'first',
          layerType: layerTypes.DATA,
          shape: GaugeShapes.HORIZONTAL_BULLET,
          metricAccessor: 'metric-column',
        } as GaugeVisualizationState,
        keptLayerIds: ['first'],
        subVisualizationId: GaugeShapes.VERTICAL_BULLET,
      })
    ).toEqual([
      {
        state: {
          layerType: layerTypes.DATA,
          shape: GaugeShapes.VERTICAL_BULLET,
          metricAccessor: 'metric-column',
          labelMajorMode: 'auto',
          ticksPosition: 'auto',
          layerId: 'first',
        },
        previewIcon: 'empty',
        title: 'Gauge',
        hide: false, // shows suggestion when current is gauge
        score: 0.5,
      },
    ]);
  });
});
