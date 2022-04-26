/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getColorAssignments } from './color_assignment';
import type { FormatFactory, LensMultiTable } from '../../common';
import { layerTypes } from '../../common';
import { XYDataLayerConfig } from './types';

describe('color_assignment', () => {
  const layers: XYDataLayerConfig[] = [
    {
      seriesType: 'bar',
      palette: { type: 'palette', name: 'palette1' },
      layerId: '1',
      layerType: layerTypes.DATA,
      splitAccessor: 'split1',
      accessors: ['y1', 'y2'],
    },
    {
      seriesType: 'bar',
      palette: { type: 'palette', name: 'palette2' },
      layerId: '2',
      layerType: layerTypes.DATA,
      splitAccessor: 'split2',
      accessors: ['y3', 'y4'],
    },
  ];

  const data: LensMultiTable = {
    type: 'lens_multitable',
    tables: {
      '1': {
        type: 'datatable',
        columns: [
          { id: 'split1', name: '', meta: { type: 'number' } },
          { id: 'y1', name: '', meta: { type: 'number' } },
          { id: 'y2', name: '', meta: { type: 'number' } },
        ],
        rows: [
          { split1: 1 },
          { split1: 2 },
          { split1: 3 },
          { split1: 1 },
          { split1: 2 },
          { split1: 3 },
        ],
      },
      '2': {
        type: 'datatable',
        columns: [
          { id: 'split2', name: '', meta: { type: 'number' } },
          { id: 'y1', name: '', meta: { type: 'number' } },
          { id: 'y2', name: '', meta: { type: 'number' } },
        ],
        rows: [
          { split2: 1 },
          { split2: 2 },
          { split2: 3 },
          { split2: 1 },
          { split2: 2 },
          { split2: 3 },
        ],
      },
    },
  };

  const formatFactory = (() =>
    ({
      convert(x: unknown) {
        return x;
      },
    } as unknown)) as FormatFactory;

  describe('totalSeriesCount', () => {
    it('should calculate total number of series per palette', () => {
      const assignments = getColorAssignments(layers, data, formatFactory);
      // two y accessors, with 3 splitted series
      expect(assignments.palette1.totalSeriesCount).toEqual(2 * 3);
      expect(assignments.palette2.totalSeriesCount).toEqual(2 * 3);
    });

    it('should calculate total number of series spanning multible layers', () => {
      const assignments = getColorAssignments(
        [layers[0], { ...layers[1], palette: layers[0].palette }],
        data,
        formatFactory
      );
      // two y accessors, with 3 splitted series, two times
      expect(assignments.palette1.totalSeriesCount).toEqual(2 * 3 + 2 * 3);
      expect(assignments.palette2).toBeUndefined();
    });

    it('should calculate total number of series for non split series', () => {
      const assignments = getColorAssignments(
        [layers[0], { ...layers[1], palette: layers[0].palette, splitAccessor: undefined }],
        data,
        formatFactory
      );
      // two y accessors, with 3 splitted series for the first layer, 2 non splitted y accessors for the second layer
      expect(assignments.palette1.totalSeriesCount).toEqual(2 * 3 + 2);
      expect(assignments.palette2).toBeUndefined();
    });

    it('should format non-primitive values and count them correctly', () => {
      const complexObject = { aProp: 123 };
      const formatMock = jest.fn((x) => 'formatted');
      const assignments = getColorAssignments(
        layers,
        {
          ...data,
          tables: {
            ...data.tables,
            '1': { ...data.tables['1'], rows: [{ split1: complexObject }, { split1: 'abc' }] },
          },
        },
        (() =>
          ({
            convert: formatMock,
          } as unknown)) as FormatFactory
      );
      expect(assignments.palette1.totalSeriesCount).toEqual(2 * 2);
      expect(assignments.palette2.totalSeriesCount).toEqual(2 * 3);
      expect(formatMock).toHaveBeenCalledWith(complexObject);
    });

    it('should handle missing tables', () => {
      const assignments = getColorAssignments(layers, { ...data, tables: {} }, formatFactory);
      // if there is no data, just assume a single split
      expect(assignments.palette1.totalSeriesCount).toEqual(2);
    });

    it('should handle missing columns', () => {
      const assignments = getColorAssignments(
        layers,
        {
          ...data,
          tables: {
            ...data.tables,
            '1': {
              ...data.tables['1'],
              columns: [],
            },
          },
        },
        formatFactory
      );
      // if the split column is missing, just assume a single split
      expect(assignments.palette1.totalSeriesCount).toEqual(2);
    });
  });

  describe('getRank', () => {
    it('should return the correct rank for a series key', () => {
      const assignments = getColorAssignments(layers, data, formatFactory);
      // 3 series in front of 2/y2 - 1/y1, 1/y2 and 2/y1
      expect(assignments.palette1.getRank(layers[0], '2', 'y2')).toEqual(3);
      // 1 series in front of 1/y4 - 1/y3
      expect(assignments.palette2.getRank(layers[1], '1', 'y4')).toEqual(1);
    });

    it('should return the correct rank for a series key spanning multiple layers', () => {
      const newLayers = [layers[0], { ...layers[1], palette: layers[0].palette }];
      const assignments = getColorAssignments(newLayers, data, formatFactory);
      // 3 series in front of 2/y2 - 1/y1, 1/y2 and 2/y1
      expect(assignments.palette1.getRank(newLayers[0], '2', 'y2')).toEqual(3);
      // 2 series in front for the current layer (1/y3, 1/y4), plus all 6 series from the first layer
      expect(assignments.palette1.getRank(newLayers[1], '2', 'y3')).toEqual(8);
    });

    it('should return the correct rank for a series without a split', () => {
      const newLayers = [
        layers[0],
        { ...layers[1], palette: layers[0].palette, splitAccessor: undefined },
      ];
      const assignments = getColorAssignments(newLayers, data, formatFactory);
      // 3 series in front of 2/y2 - 1/y1, 1/y2 and 2/y1
      expect(assignments.palette1.getRank(newLayers[0], '2', 'y2')).toEqual(3);
      // 1 series in front for the current layer (y3), plus all 6 series from the first layer
      expect(assignments.palette1.getRank(newLayers[1], 'Metric y4', 'y4')).toEqual(7);
    });

    it('should return the correct rank for a series with a non-primitive value', () => {
      const assignments = getColorAssignments(
        layers,
        {
          ...data,
          tables: {
            ...data.tables,
            '1': { ...data.tables['1'], rows: [{ split1: 'abc' }, { split1: { aProp: 123 } }] },
          },
        },
        (() =>
          ({
            convert: () => 'formatted',
          } as unknown)) as FormatFactory
      );
      // 3 series in front of (complex object)/y1 - abc/y1, abc/y2
      expect(assignments.palette1.getRank(layers[0], 'formatted', 'y1')).toEqual(2);
    });

    it('should handle missing tables', () => {
      const assignments = getColorAssignments(layers, { ...data, tables: {} }, formatFactory);
      // if there is no data, assume it is the first splitted series. One series in front - 0/y1
      expect(assignments.palette1.getRank(layers[0], '2', 'y2')).toEqual(1);
    });

    it('should handle missing columns', () => {
      const assignments = getColorAssignments(
        layers,
        {
          ...data,
          tables: {
            ...data.tables,
            '1': {
              ...data.tables['1'],
              columns: [],
            },
          },
        },
        formatFactory
      );
      // if the split column is missing, assume it is the first splitted series. One series in front - 0/y1
      expect(assignments.palette1.getRank(layers[0], '2', 'y2')).toEqual(1);
    });
  });
});
