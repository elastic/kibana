/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DataType } from '../types';
import { suggestions } from './suggestions';

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
            shape: 'pie',
            layers: [
              {
                layerId: 'first',
                groups: [],
                metric: 'a',
                numberDisplay: 'hidden',
                categoryDisplay: 'default',
                legendDisplay: 'default',
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

    it('should reject any date operations', () => {
      expect(
        suggestions({
          table: {
            layerId: 'first',
            isMultiRow: true,
            columns: [
              {
                columnId: 'b',
                operation: { label: 'Days', dataType: 'date' as DataType, isBucketed: true },
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

    it('should reject when there are no buckets', () => {
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
          state: undefined,
          keptLayerIds: ['first'],
        })
      ).toHaveLength(0);
    });

    it('should reject when there are no metrics', () => {
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
          state: undefined,
          keptLayerIds: ['first'],
        })
      ).toHaveLength(0);
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
          state: expect.objectContaining({ shape: 'donut' }),
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
          state: expect.objectContaining({ shape: 'pie' }),
        })
      );
    });

    it('should keep the layer settings when switching from treemap', () => {
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
            shape: 'treemap',
            layers: [
              {
                layerId: 'first',
                groups: ['a'],
                metric: 'b',

                numberDisplay: 'hidden',
                categoryDisplay: 'inside',
                legendDisplay: 'show',
                percentDecimals: 0,
                nestedLegend: true,
              },
            ],
          },
          keptLayerIds: ['first'],
        })
      ).toContainEqual(
        expect.objectContaining({
          state: {
            shape: 'donut',
            layers: [
              {
                layerId: 'first',
                groups: ['a'],
                metric: 'b',

                numberDisplay: 'hidden',
                categoryDisplay: 'inside',
                legendDisplay: 'show',
                percentDecimals: 0,
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
            shape: 'treemap',
            layers: [
              {
                layerId: 'first',
                groups: [],
                metric: 'a',

                numberDisplay: 'hidden',
                categoryDisplay: 'default',
                legendDisplay: 'default',
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
            shape: 'treemap',
            layers: [
              {
                layerId: 'first',
                groups: ['a', 'b'],
                metric: 'e',
                numberDisplay: 'value',
                categoryDisplay: 'default',
                legendDisplay: 'default',
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
            shape: 'treemap',
            layers: [
              {
                layerId: 'first',
                groups: ['a', 'b'],
                metric: 'e',
                numberDisplay: 'percent',
                categoryDisplay: 'default',
                legendDisplay: 'default',
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
            shape: 'pie',
            layers: [
              {
                layerId: 'first',
                groups: ['a'],
                metric: 'b',

                numberDisplay: 'hidden',
                categoryDisplay: 'inside',
                legendDisplay: 'show',
                percentDecimals: 0,
                nestedLegend: true,
              },
            ],
          },
          keptLayerIds: ['first'],
        })
      ).toContainEqual(
        expect.objectContaining({
          state: {
            shape: 'treemap',
            layers: [
              {
                layerId: 'first',
                groups: ['a'],
                metric: 'b',

                numberDisplay: 'hidden',
                categoryDisplay: 'default', // This is changed
                legendDisplay: 'show',
                percentDecimals: 0,
                nestedLegend: true,
              },
            ],
          },
        })
      );
    });
  });
});
