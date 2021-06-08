/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSuggestions } from './suggestions';
import { HeatmapVisualizationState } from './types';
import { HEATMAP_GRID_FUNCTION, LEGEND_FUNCTION } from './constants';
import { Position } from '@elastic/charts';

describe('heatmap suggestions', () => {
  describe('rejects suggestions', () => {
    test('when currently active and unchanged data', () => {
      expect(
        getSuggestions({
          table: {
            layerId: 'first',
            isMultiRow: true,
            columns: [],
            changeType: 'unchanged',
          },
          state: {
            shape: 'heatmap',
            layerId: 'first',
          } as HeatmapVisualizationState,
          keptLayerIds: ['first'],
        })
      ).toHaveLength(0);
    });

    test('when there are 3 or more buckets', () => {
      expect(
        getSuggestions({
          table: {
            layerId: 'first',
            isMultiRow: true,
            columns: [
              {
                columnId: 'date-column-01',
                operation: {
                  isBucketed: true,
                  dataType: 'date',
                  scale: 'interval',
                  label: 'Date',
                },
              },
              {
                columnId: 'date-column-02',
                operation: {
                  isBucketed: true,
                  dataType: 'date',
                  scale: 'interval',
                  label: 'Date',
                },
              },
              {
                columnId: 'another-bucket-column',
                operation: {
                  isBucketed: true,
                  dataType: 'string',
                  scale: 'ratio',
                  label: 'Bucket',
                },
              },
              {
                columnId: 'metric-column',
                operation: {
                  isBucketed: false,
                  dataType: 'number',
                  scale: 'ratio',
                  label: 'Metric',
                },
              },
            ],
            changeType: 'initial',
          },
          state: {
            layerId: 'first',
          } as HeatmapVisualizationState,
          keptLayerIds: ['first'],
        })
      ).toEqual([]);
    });

    test('when currently active with partial configuration and not extended change type', () => {
      expect(
        getSuggestions({
          table: {
            layerId: 'first',
            isMultiRow: true,
            columns: [],
            changeType: 'initial',
          },
          state: {
            shape: 'heatmap',
            layerId: 'first',
            xAccessor: 'some-field',
          } as HeatmapVisualizationState,
          keptLayerIds: ['first'],
        })
      ).toHaveLength(0);
    });
  });

  describe('hides suggestions', () => {
    test('when table is reduced', () => {
      expect(
        getSuggestions({
          table: {
            layerId: 'first',
            isMultiRow: true,
            columns: [],
            changeType: 'reduced',
          },
          state: {
            layerId: 'first',
          } as HeatmapVisualizationState,
          keptLayerIds: ['first'],
        })
      ).toEqual([
        {
          state: {
            layerId: 'first',
            shape: 'heatmap',
            gridConfig: {
              type: HEATMAP_GRID_FUNCTION,
              isCellLabelVisible: false,
              isYAxisLabelVisible: true,
              isXAxisLabelVisible: true,
            },
            legend: {
              isVisible: true,
              position: Position.Right,
              type: LEGEND_FUNCTION,
            },
          },
          title: 'Heatmap',
          hide: true,
          previewIcon: 'empty',
          score: 0,
        },
      ]);
    });
    test('for tables with a single bucket dimension', () => {
      expect(
        getSuggestions({
          table: {
            layerId: 'first',
            isMultiRow: true,
            columns: [
              {
                columnId: 'test-column',
                operation: {
                  isBucketed: true,
                  dataType: 'date',
                  scale: 'interval',
                  label: 'Date',
                },
              },
            ],
            changeType: 'reduced',
          },
          state: {
            layerId: 'first',
          } as HeatmapVisualizationState,
          keptLayerIds: ['first'],
        })
      ).toEqual([
        {
          state: {
            layerId: 'first',
            shape: 'heatmap',
            xAccessor: 'test-column',
            gridConfig: {
              type: HEATMAP_GRID_FUNCTION,
              isCellLabelVisible: false,
              isYAxisLabelVisible: true,
              isXAxisLabelVisible: true,
            },
            legend: {
              isVisible: true,
              position: Position.Right,
              type: LEGEND_FUNCTION,
            },
          },
          title: 'Heatmap',
          hide: true,
          previewIcon: 'empty',
          score: 0.3,
        },
      ]);
    });
  });

  describe('shows suggestions', () => {
    test('when at least one axis and value accessor are available', () => {
      expect(
        getSuggestions({
          table: {
            layerId: 'first',
            isMultiRow: true,
            columns: [
              {
                columnId: 'date-column',
                operation: {
                  isBucketed: true,
                  dataType: 'date',
                  scale: 'interval',
                  label: 'Date',
                },
              },
              {
                columnId: 'metric-column',
                operation: {
                  isBucketed: false,
                  dataType: 'number',
                  scale: 'ratio',
                  label: 'Metric',
                },
              },
            ],
            changeType: 'initial',
          },
          state: {
            layerId: 'first',
          } as HeatmapVisualizationState,
          keptLayerIds: ['first'],
        })
      ).toEqual([
        {
          state: {
            layerId: 'first',
            shape: 'heatmap',
            xAccessor: 'date-column',
            valueAccessor: 'metric-column',
            gridConfig: {
              type: HEATMAP_GRID_FUNCTION,
              isCellLabelVisible: false,
              isYAxisLabelVisible: true,
              isXAxisLabelVisible: true,
            },
            legend: {
              isVisible: true,
              position: Position.Right,
              type: LEGEND_FUNCTION,
            },
          },
          title: 'Heatmap',
          // Temp hide all suggestions while heatmap is in beta
          hide: true,
          previewIcon: 'empty',
          score: 0.6,
        },
      ]);
    });

    test('when complete configuration has been resolved', () => {
      expect(
        getSuggestions({
          table: {
            layerId: 'first',
            isMultiRow: true,
            columns: [
              {
                columnId: 'date-column',
                operation: {
                  isBucketed: true,
                  dataType: 'date',
                  scale: 'interval',
                  label: 'Date',
                },
              },
              {
                columnId: 'metric-column',
                operation: {
                  isBucketed: false,
                  dataType: 'number',
                  scale: 'ratio',
                  label: 'Metric',
                },
              },
              {
                columnId: 'group-column',
                operation: {
                  isBucketed: true,
                  dataType: 'string',
                  scale: 'ratio',
                  label: 'Group',
                },
              },
            ],
            changeType: 'initial',
          },
          state: {
            layerId: 'first',
          } as HeatmapVisualizationState,
          keptLayerIds: ['first'],
        })
      ).toEqual([
        {
          state: {
            layerId: 'first',
            shape: 'heatmap',
            xAccessor: 'date-column',
            yAccessor: 'group-column',
            valueAccessor: 'metric-column',
            gridConfig: {
              type: HEATMAP_GRID_FUNCTION,
              isCellLabelVisible: false,
              isYAxisLabelVisible: true,
              isXAxisLabelVisible: true,
            },
            legend: {
              isVisible: true,
              position: Position.Right,
              type: LEGEND_FUNCTION,
            },
          },
          title: 'Heatmap',
          // Temp hide all suggestions while heatmap is in beta
          hide: true,
          previewIcon: 'empty',
          score: 0.9,
        },
      ]);
    });
  });
});
