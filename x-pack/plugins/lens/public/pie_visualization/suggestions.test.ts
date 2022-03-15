/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PaletteOutput } from 'src/plugins/charts/public';
import { suggestions } from './suggestions';
import type { DataType, SuggestionRequest } from '../types';
import {
  CategoryDisplay,
  LegendDisplay,
  NumberDisplay,
  PieChartTypes,
  PieLayerState,
  PieVisualizationState,
} from '../../common';
import { layerTypes } from '../../common';

describe('suggestions', () => {
  describe('pie', () => {
    it('should reject multiple layer suggestions', () => {
      expect(
        suggestions({
          table: {
            layerId: 'first',
            isMultiRow: true,
            columns: [],
            changeType: 'initial',
          },
          state: undefined,
          keptLayerIds: ['first', 'second'],
        })
      ).toHaveLength(0);
    });

    it('should reject when layer is different', () => {
      expect(
        suggestions({
          table: {
            layerId: 'first',
            isMultiRow: true,
            columns: [],
            changeType: 'initial',
          },
          state: undefined,
          keptLayerIds: ['second'],
        })
      ).toHaveLength(0);
    });

    it('should reject when currently active and unchanged data', () => {
      expect(
        suggestions({
          table: {
            layerId: 'first',
            isMultiRow: true,
            columns: [],
            changeType: 'unchanged',
          },
          state: {
            shape: PieChartTypes.PIE,
            layers: [
              {
                layerId: 'first',
                layerType: layerTypes.DATA,
                groups: [],
                metric: 'a',
                numberDisplay: NumberDisplay.HIDDEN,
                categoryDisplay: CategoryDisplay.DEFAULT,
                legendDisplay: LegendDisplay.DEFAULT,
              },
            ],
          },
          keptLayerIds: ['first'],
        })
      ).toHaveLength(0);
    });

    it('should reject when table is reordered', () => {
      expect(
        suggestions({
          table: {
            layerId: 'first',
            isMultiRow: true,
            columns: [],
            changeType: 'reorder',
          },
          state: undefined,
          keptLayerIds: ['first'],
        })
      ).toHaveLength(0);
    });

    it('should reject date operations', () => {
      expect(
        suggestions({
          table: {
            layerId: 'first',
            isMultiRow: true,
            columns: [
              {
                columnId: 'b',
                operation: {
                  label: 'Days',
                  dataType: 'date' as DataType,
                  isBucketed: true,
                  scale: 'interval',
                },
              },
              {
                columnId: 'c',
                operation: { label: 'Count', dataType: 'number' as DataType, isBucketed: false },
              },
            ],
            changeType: 'initial',
          },
          state: undefined,
          keptLayerIds: ['first'],
        })
      ).toHaveLength(0);
    });

    it('should reject histogram operations', () => {
      expect(
        suggestions({
          table: {
            layerId: 'first',
            isMultiRow: true,
            columns: [
              {
                columnId: 'b',
                operation: {
                  label: 'Durations',
                  dataType: 'number' as DataType,
                  isBucketed: true,
                  scale: 'interval',
                },
              },
              {
                columnId: 'c',
                operation: { label: 'Count', dataType: 'number' as DataType, isBucketed: false },
              },
            ],
            changeType: 'initial',
          },
          state: undefined,
          keptLayerIds: ['first'],
        })
      ).toHaveLength(0);
    });

    it('should not reject histogram operations in case of switching between partition charts', () => {
      expect(
        suggestions({
          table: {
            layerId: 'first',
            isMultiRow: true,
            columns: [
              {
                columnId: 'b',
                operation: {
                  label: 'Durations',
                  dataType: 'number' as DataType,
                  isBucketed: true,
                  scale: 'interval',
                },
              },
              {
                columnId: 'c',
                operation: { label: 'Count', dataType: 'number' as DataType, isBucketed: false },
              },
            ],
            changeType: 'initial',
          },
          state: {
            shape: PieChartTypes.MOSAIC,
            layers: [{} as PieLayerState],
          },
          keptLayerIds: ['first'],
        }).length
      ).toBeGreaterThan(0);
    });

    it('should reject when there are too many buckets', () => {
      expect(
        suggestions({
          table: {
            layerId: 'first',
            isMultiRow: true,
            columns: [
              {
                columnId: 'a',
                operation: { label: 'Top 5', dataType: 'string' as DataType, isBucketed: true },
              },
              {
                columnId: 'b',
                operation: { label: 'Top 5', dataType: 'string' as DataType, isBucketed: true },
              },
              {
                columnId: 'c',
                operation: { label: 'Top 5', dataType: 'string' as DataType, isBucketed: true },
              },
              {
                columnId: 'd',
                operation: { label: 'Top 5', dataType: 'string' as DataType, isBucketed: true },
              },
              {
                columnId: 'e',
                operation: { label: 'Count', dataType: 'number' as DataType, isBucketed: false },
              },
            ],
            changeType: 'initial',
          },
          state: undefined,
          keptLayerIds: ['first'],
        })
      ).toHaveLength(0);
    });

    it('should reject when there are too many metrics', () => {
      expect(
        suggestions({
          table: {
            layerId: 'first',
            isMultiRow: true,
            columns: [
              {
                columnId: 'a',
                operation: { label: 'Top 5', dataType: 'string' as DataType, isBucketed: true },
              },
              {
                columnId: 'b',
                operation: { label: 'Top 5', dataType: 'string' as DataType, isBucketed: true },
              },
              {
                columnId: 'c',
                operation: { label: 'Top 5', dataType: 'string' as DataType, isBucketed: true },
              },
              {
                columnId: 'd',
                operation: { label: 'Avg', dataType: 'number' as DataType, isBucketed: false },
              },
              {
                columnId: 'e',
                operation: { label: 'Count', dataType: 'number' as DataType, isBucketed: false },
              },
            ],
            changeType: 'initial',
          },
          state: undefined,
          keptLayerIds: ['first'],
        })
      ).toHaveLength(0);
    });

    it('should reject if there are no buckets and it is not a specific chart type switch', () => {
      expect(
        suggestions({
          table: {
            layerId: 'first',
            isMultiRow: true,
            columns: [
              {
                columnId: 'c',
                operation: { label: 'Count', dataType: 'number' as DataType, isBucketed: false },
              },
            ],
            changeType: 'initial',
          },
          state: {} as PieVisualizationState,
          keptLayerIds: ['first'],
        })
      ).toHaveLength(0);
    });

    it('should reject if there are no metrics and it is not a specific chart type switch', () => {
      expect(
        suggestions({
          table: {
            layerId: 'first',
            isMultiRow: true,
            columns: [
              {
                columnId: 'c',
                operation: { label: 'Count', dataType: 'number' as DataType, isBucketed: true },
              },
            ],
            changeType: 'initial',
          },
          state: {} as PieVisualizationState,
          keptLayerIds: ['first'],
        })
      ).toHaveLength(0);
    });

    it('should reject when metric value isStaticValue', () => {
      const results = suggestions({
        table: {
          layerId: 'first',
          isMultiRow: true,
          columns: [
            {
              columnId: 'a',
              operation: { label: 'Top 5', dataType: 'string' as DataType, isBucketed: true },
            },
            {
              columnId: 'e',
              operation: {
                label: 'Count',
                dataType: 'number' as DataType,
                isBucketed: false,
                isStaticValue: true,
              },
            },
          ],
          changeType: 'initial',
        },
        state: undefined,
        keptLayerIds: ['first'],
      });

      expect(results.length).toEqual(0);
    });

    it('should hide suggestions when there are no buckets', () => {
      const currentSuggestions = suggestions({
        table: {
          layerId: 'first',
          isMultiRow: true,
          columns: [
            {
              columnId: 'c',
              operation: { label: 'Count', dataType: 'number' as DataType, isBucketed: false },
            },
          ],
          changeType: 'initial',
        },
        state: undefined,
        keptLayerIds: ['first'],
      });
      expect(currentSuggestions).toHaveLength(5);
      expect(currentSuggestions.every((s) => s.hide)).toEqual(true);
    });

    it('should hide suggestions when there are no metrics', () => {
      const currentSuggestions = suggestions({
        table: {
          layerId: 'first',
          isMultiRow: true,
          columns: [
            {
              columnId: 'c',
              operation: { label: 'Count', dataType: 'number' as DataType, isBucketed: true },
            },
          ],
          changeType: 'initial',
        },
        state: undefined,
        keptLayerIds: ['first'],
      });
      expect(currentSuggestions).toHaveLength(5);
      expect(currentSuggestions.every((s) => s.hide)).toEqual(true);
    });

    it('should suggest a donut chart as initial state when only one bucket', () => {
      const results = suggestions({
        table: {
          layerId: 'first',
          isMultiRow: true,
          columns: [
            {
              columnId: 'a',
              operation: { label: 'Top 5', dataType: 'string' as DataType, isBucketed: true },
            },
            {
              columnId: 'e',
              operation: { label: 'Count', dataType: 'number' as DataType, isBucketed: false },
            },
          ],
          changeType: 'initial',
        },
        state: undefined,
        keptLayerIds: ['first'],
      });

      expect(results).toContainEqual(
        expect.objectContaining({
          state: expect.objectContaining({ shape: PieChartTypes.DONUT }),
        })
      );
    });

    it('should suggest a pie chart as initial state when more than one bucket', () => {
      const results = suggestions({
        table: {
          layerId: 'first',
          isMultiRow: true,
          columns: [
            {
              columnId: 'a',
              operation: { label: 'Top 5', dataType: 'string' as DataType, isBucketed: true },
            },
            {
              columnId: 'b',
              operation: { label: 'Top 5', dataType: 'string' as DataType, isBucketed: true },
            },
            {
              columnId: 'e',
              operation: { label: 'Count', dataType: 'number' as DataType, isBucketed: false },
            },
          ],
          changeType: 'initial',
        },
        state: undefined,
        keptLayerIds: ['first'],
      });

      expect(results).toContainEqual(
        expect.objectContaining({
          state: expect.objectContaining({ shape: PieChartTypes.PIE }),
        })
      );
    });

    it('should score higher for more groups', () => {
      const config: SuggestionRequest<PieVisualizationState> = {
        table: {
          layerId: 'first',
          isMultiRow: true,
          columns: [
            {
              columnId: 'a',
              operation: { label: 'Top 5', dataType: 'string' as DataType, isBucketed: true },
            },
            {
              columnId: 'b',
              operation: { label: 'Top 5', dataType: 'string' as DataType, isBucketed: true },
            },
            {
              columnId: 'e',
              operation: { label: 'Count', dataType: 'number' as DataType, isBucketed: false },
            },
          ],
          changeType: 'initial',
        },
        state: undefined,
        keptLayerIds: ['first'],
      };
      const twoGroupsResults = suggestions(config);
      config.table.columns.splice(1, 1);
      const oneGroupResults = suggestions(config);

      expect(Math.max(...twoGroupsResults.map((suggestion) => suggestion.score))).toBeGreaterThan(
        Math.max(...oneGroupResults.map((suggestion) => suggestion.score))
      );
    });

    it('should score higher for more groups for each subvis with passed-in subvis id', () => {
      const config: SuggestionRequest<PieVisualizationState> = {
        table: {
          layerId: 'first',
          isMultiRow: true,
          columns: [
            {
              columnId: 'a',
              operation: { label: 'Top 5', dataType: 'string' as DataType, isBucketed: true },
            },
            {
              columnId: 'b',
              operation: { label: 'Top 5', dataType: 'string' as DataType, isBucketed: true },
            },
            {
              columnId: 'e',
              operation: { label: 'Count', dataType: 'number' as DataType, isBucketed: false },
            },
          ],
          changeType: 'initial',
        },
        state: undefined,
        keptLayerIds: ['first'],
        subVisualizationId: 'donut',
      };
      const twoGroupsResults = suggestions(config);
      config.table.columns.splice(1, 1);
      const oneGroupResults = suggestions(config);
      // collect scores for one or two groups for each sub vis
      const scores: Record<string, { two: number; one: number }> = {};
      twoGroupsResults.forEach((r) => {
        scores[r.state.shape] = { ...(scores[r.state.shape] || {}), two: r.score };
      });
      oneGroupResults.forEach((r) => {
        scores[r.state.shape] = { ...(scores[r.state.shape] || {}), one: r.score };
      });
      expect(Object.keys(scores).length).toEqual(2);
      Object.values(scores).forEach(({ one, two }) => {
        expect(two).toBeGreaterThan(one);
      });
    });

    it('should keep passed in palette', () => {
      const mainPalette: PaletteOutput = { type: 'palette', name: 'mock' };
      const results = suggestions({
        table: {
          layerId: 'first',
          isMultiRow: true,
          columns: [
            {
              columnId: 'a',
              operation: { label: 'Top 5', dataType: 'string' as DataType, isBucketed: true },
            },
            {
              columnId: 'b',
              operation: { label: 'Top 5', dataType: 'string' as DataType, isBucketed: true },
            },
            {
              columnId: 'e',
              operation: { label: 'Count', dataType: 'number' as DataType, isBucketed: false },
            },
          ],
          changeType: 'initial',
        },
        state: undefined,
        keptLayerIds: ['first'],
        mainPalette,
      });

      expect(results[0].state.palette).toEqual(mainPalette);
    });

    it('should keep the layer settings and palette when switching from treemap', () => {
      const palette: PaletteOutput = { type: 'palette', name: 'mock' };
      expect(
        suggestions({
          table: {
            layerId: 'first',
            isMultiRow: true,
            columns: [
              {
                columnId: 'a',
                operation: { label: 'Top 5', dataType: 'string' as DataType, isBucketed: true },
              },
              {
                columnId: 'b',
                operation: { label: 'Count', dataType: 'number' as DataType, isBucketed: false },
              },
            ],
            changeType: 'unchanged',
          },
          state: {
            shape: PieChartTypes.TREEMAP,
            palette,
            layers: [
              {
                layerId: 'first',
                layerType: layerTypes.DATA,
                groups: ['a'],
                metric: 'b',

                numberDisplay: NumberDisplay.HIDDEN,
                categoryDisplay: CategoryDisplay.INSIDE,
                legendDisplay: LegendDisplay.SHOW,
                percentDecimals: 0,
                legendMaxLines: 1,
                truncateLegend: true,
                nestedLegend: true,
              },
            ],
          },
          keptLayerIds: ['first'],
        })
      ).toContainEqual(
        expect.objectContaining({
          state: {
            shape: PieChartTypes.DONUT,
            palette,
            layers: [
              {
                layerId: 'first',
                layerType: layerTypes.DATA,
                groups: ['a'],
                metric: 'b',

                numberDisplay: NumberDisplay.HIDDEN,
                categoryDisplay: CategoryDisplay.INSIDE,
                legendDisplay: 'show',
                percentDecimals: 0,
                legendMaxLines: 1,
                truncateLegend: true,
                nestedLegend: true,
              },
            ],
          },
        })
      );
    });
  });

  describe('treemap', () => {
    it('should reject when currently active and unchanged data', () => {
      expect(
        suggestions({
          table: {
            layerId: 'first',
            isMultiRow: true,
            columns: [],
            changeType: 'unchanged',
          },
          state: {
            shape: PieChartTypes.TREEMAP,
            layers: [
              {
                layerId: 'first',
                layerType: layerTypes.DATA,
                groups: [],
                metric: 'a',

                numberDisplay: NumberDisplay.HIDDEN,
                categoryDisplay: CategoryDisplay.DEFAULT,
                legendDisplay: LegendDisplay.DEFAULT,
              },
            ],
          },
          keptLayerIds: ['first'],
        })
      ).toHaveLength(0);
    });

    it('should reject when there are too many buckets being added', () => {
      expect(
        suggestions({
          table: {
            layerId: 'first',
            isMultiRow: true,
            columns: [
              {
                columnId: 'a',
                operation: { label: 'Top 5', dataType: 'string' as DataType, isBucketed: true },
              },
              {
                columnId: 'b',
                operation: { label: 'Top 5', dataType: 'string' as DataType, isBucketed: true },
              },
              {
                columnId: 'c',
                operation: { label: 'Top 5', dataType: 'string' as DataType, isBucketed: true },
              },
              {
                columnId: 'd',
                operation: { label: 'Top 5', dataType: 'string' as DataType, isBucketed: true },
              },
              {
                columnId: 'e',
                operation: { label: 'Count', dataType: 'number' as DataType, isBucketed: false },
              },
            ],
            changeType: 'extended',
          },
          state: {
            shape: PieChartTypes.TREEMAP,
            layers: [
              {
                layerId: 'first',
                layerType: layerTypes.DATA,
                groups: ['a', 'b'],
                metric: 'e',
                numberDisplay: NumberDisplay.VALUE,
                categoryDisplay: CategoryDisplay.DEFAULT,
                legendDisplay: LegendDisplay.DEFAULT,
              },
            ],
          },
          keptLayerIds: ['first'],
        })
      ).toHaveLength(0);
    });

    it('should reject when there are too many metrics', () => {
      expect(
        suggestions({
          table: {
            layerId: 'first',
            isMultiRow: true,
            columns: [
              {
                columnId: 'a',
                operation: { label: 'Top 5', dataType: 'string' as DataType, isBucketed: true },
              },
              {
                columnId: 'b',
                operation: { label: 'Top 5', dataType: 'string' as DataType, isBucketed: true },
              },
              {
                columnId: 'c',
                operation: { label: 'Top 5', dataType: 'string' as DataType, isBucketed: true },
              },
              {
                columnId: 'd',
                operation: { label: 'Avg', dataType: 'number' as DataType, isBucketed: false },
              },
              {
                columnId: 'e',
                operation: { label: 'Count', dataType: 'number' as DataType, isBucketed: false },
              },
            ],
            changeType: 'initial',
          },
          state: {
            shape: PieChartTypes.TREEMAP,
            layers: [
              {
                layerId: 'first',
                layerType: layerTypes.DATA,
                groups: ['a', 'b'],
                metric: 'e',
                numberDisplay: NumberDisplay.PERCENT,
                categoryDisplay: CategoryDisplay.DEFAULT,
                legendDisplay: LegendDisplay.DEFAULT,
              },
            ],
          },
          keptLayerIds: ['first'],
        })
      ).toHaveLength(0);
    });

    it('should keep the layer settings when switching from pie', () => {
      expect(
        suggestions({
          table: {
            layerId: 'first',
            isMultiRow: true,
            columns: [
              {
                columnId: 'a',
                operation: { label: 'Top 5', dataType: 'string' as DataType, isBucketed: true },
              },
              {
                columnId: 'b',
                operation: { label: 'Count', dataType: 'number' as DataType, isBucketed: false },
              },
            ],
            changeType: 'unchanged',
          },
          state: {
            shape: PieChartTypes.PIE,
            layers: [
              {
                layerId: 'first',
                layerType: layerTypes.DATA,
                groups: ['a'],
                metric: 'b',

                numberDisplay: NumberDisplay.HIDDEN,
                categoryDisplay: CategoryDisplay.INSIDE,
                legendDisplay: LegendDisplay.SHOW,
                percentDecimals: 0,
                legendMaxLines: 1,
                truncateLegend: true,
                nestedLegend: true,
              },
            ],
          },
          keptLayerIds: ['first'],
        })
      ).toContainEqual(
        expect.objectContaining({
          state: {
            shape: PieChartTypes.TREEMAP,
            layers: [
              {
                layerId: 'first',
                layerType: layerTypes.DATA,
                groups: ['a'],
                metric: 'b',

                numberDisplay: NumberDisplay.HIDDEN,
                categoryDisplay: CategoryDisplay.DEFAULT, // This is changed
                legendDisplay: 'show',
                percentDecimals: 0,
                legendMaxLines: 1,
                truncateLegend: true,
                nestedLegend: true,
              },
            ],
          },
        })
      );
    });
  });

  describe('mosaic', () => {
    it('should reject when currently active and unchanged data', () => {
      expect(
        suggestions({
          table: {
            layerId: 'first',
            isMultiRow: true,
            columns: [],
            changeType: 'unchanged',
          },
          state: {
            shape: PieChartTypes.MOSAIC,
            layers: [
              {
                layerId: 'first',
                layerType: layerTypes.DATA,
                groups: [],
                metric: 'a',

                numberDisplay: NumberDisplay.HIDDEN,
                categoryDisplay: CategoryDisplay.DEFAULT,
                legendDisplay: LegendDisplay.DEFAULT,
              },
            ],
          },
          keptLayerIds: ['first'],
        })
      ).toHaveLength(0);
    });

    it('mosaic type should be hidden from the suggestion list', () => {
      expect(
        suggestions({
          table: {
            layerId: 'first',
            isMultiRow: true,
            columns: [
              {
                columnId: 'a',
                operation: { label: 'Top 5', dataType: 'string' as DataType, isBucketed: true },
              },
              {
                columnId: 'b',
                operation: { label: 'Top 6', dataType: 'string' as DataType, isBucketed: true },
              },
              {
                columnId: 'c',
                operation: { label: 'Count', dataType: 'number' as DataType, isBucketed: false },
              },
            ],
            changeType: 'unchanged',
          },
          state: {
            shape: PieChartTypes.TREEMAP,
            layers: [
              {
                layerId: 'first',
                layerType: layerTypes.DATA,
                groups: ['a', 'b'],
                metric: 'c',

                numberDisplay: NumberDisplay.HIDDEN,
                categoryDisplay: CategoryDisplay.INSIDE,
                legendDisplay: LegendDisplay.SHOW,
                percentDecimals: 0,
                legendMaxLines: 1,
                truncateLegend: true,
                nestedLegend: true,
              },
            ],
          },
          keptLayerIds: ['first'],
        }).filter(({ hide, state }) => !hide && state.shape === 'mosaic')
      ).toMatchInlineSnapshot(`Array []`);
    });
  });

  describe('waffle', () => {
    it('should reject when currently active and unchanged data', () => {
      expect(
        suggestions({
          table: {
            layerId: 'first',
            isMultiRow: true,
            columns: [],
            changeType: 'unchanged',
          },
          state: {
            shape: PieChartTypes.WAFFLE,
            layers: [
              {
                layerId: 'first',
                layerType: layerTypes.DATA,
                groups: [],
                metric: 'a',

                numberDisplay: NumberDisplay.HIDDEN,
                categoryDisplay: CategoryDisplay.DEFAULT,
                legendDisplay: LegendDisplay.DEFAULT,
              },
            ],
          },
          keptLayerIds: ['first'],
        })
      ).toHaveLength(0);
    });

    it('waffle type should be hidden from the suggestion list', () => {
      expect(
        suggestions({
          table: {
            layerId: 'first',
            isMultiRow: true,
            columns: [
              {
                columnId: 'a',
                operation: { label: 'Top 5', dataType: 'string' as DataType, isBucketed: true },
              },
              {
                columnId: 'b',
                operation: { label: 'Count', dataType: 'number' as DataType, isBucketed: false },
              },
            ],
            changeType: 'unchanged',
          },
          state: {
            shape: PieChartTypes.PIE,
            layers: [
              {
                layerId: 'first',
                layerType: layerTypes.DATA,
                groups: ['a', 'b'],
                metric: 'c',
                numberDisplay: NumberDisplay.HIDDEN,
                categoryDisplay: CategoryDisplay.INSIDE,
                legendDisplay: LegendDisplay.SHOW,
                percentDecimals: 0,
                legendMaxLines: 1,
                truncateLegend: true,
                nestedLegend: true,
              },
            ],
          },
          keptLayerIds: ['first'],
        }).filter(({ hide, state }) => !hide && state.shape === 'waffle')
      ).toMatchInlineSnapshot(`Array []`);
    });
  });
});
