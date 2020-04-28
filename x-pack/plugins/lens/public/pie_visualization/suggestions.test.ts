/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DataType } from '../types';
import { pieSuggestions } from './suggestions';

describe('suggestions', () => {
  describe('pie', () => {
    it('should reject multiple layer suggestions', () => {
      expect(
        pieSuggestions({
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
        pieSuggestions({
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
        pieSuggestions({
          table: {
            layerId: 'first',
            isMultiRow: true,
            columns: [],
            changeType: 'unchanged',
          },
          state: { shape: 'pie', layers: [{ layerId: 'first', slices: [], metric: 'a' }] },
          keptLayerIds: ['first'],
        })
      ).toHaveLength(0);
    });

    it('should reject when table is reordered', () => {
      expect(
        pieSuggestions({
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
        pieSuggestions({
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
        pieSuggestions({
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
        pieSuggestions({
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
        pieSuggestions({
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
        pieSuggestions({
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
      const suggestions = pieSuggestions({
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

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].state.shape).toEqual('donut');
    });

    it('should suggest a pie chart as initial state when more than one bucket', () => {
      const suggestions = pieSuggestions({
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

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].state.shape).toEqual('pie');
    });
  });

  describe('treemap', () => {
    it('should reject when currently active and unchanged data', () => {
      expect(
        pieSuggestions({
          table: {
            layerId: 'first',
            isMultiRow: true,
            columns: [],
            changeType: 'unchanged',
          },
          state: { shape: 'treemap', layers: [{ layerId: 'first', slices: [], metric: 'a' }] },
          keptLayerIds: ['first'],
        })
      ).toHaveLength(0);
    });

    it('should reject when there are too many buckets being added', () => {
      expect(
        pieSuggestions({
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
            layers: [{ layerId: 'first', slices: ['a', 'b'], metric: 'e' }],
          },
          keptLayerIds: ['first'],
        })
      ).toHaveLength(0);
    });

    it('should reject when there are too many metrics', () => {
      expect(
        pieSuggestions({
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
            layers: [{ layerId: 'first', slices: ['a', 'b'], metric: 'e' }],
          },
          keptLayerIds: ['first'],
        })
      ).toHaveLength(0);
    });
  });
});
