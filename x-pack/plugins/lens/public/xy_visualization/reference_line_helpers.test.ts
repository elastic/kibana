/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { XYDataLayerConfig } from '../../common/expressions';
import { FramePublicAPI } from '../types';
import { computeOverallDataDomain, getStaticValue } from './reference_line_helpers';

function getActiveData(json: Array<{ id: string; rows: Array<Record<string, number | null>> }>) {
  return json.reduce((memo, { id, rows }) => {
    const columns = Object.keys(rows[0]).map((columnId) => ({
      id: columnId,
      name: columnId,
      meta: { type: 'number' as const },
    }));
    memo[id] = {
      type: 'datatable' as const,
      columns,
      rows,
    };
    return memo;
  }, {} as NonNullable<FramePublicAPI['activeData']>);
}

describe('reference_line helpers', () => {
  describe('getStaticValue', () => {
    const hasDateHistogram = () => false;
    const hasAllNumberHistogram = () => true;

    it('should return fallback value on missing data', () => {
      expect(getStaticValue([], 'x', {}, hasAllNumberHistogram)).toBe(100);
    });

    it('should return fallback value on no-configuration/missing hit on current data', () => {
      // no-config: missing layer
      expect(
        getStaticValue(
          [],
          'x',
          {
            activeData: getActiveData([
              { id: 'id-a', rows: Array(3).fill({ a: 100, b: 100, c: 100 }) },
            ]),
          },
          hasAllNumberHistogram
        )
      ).toBe(100);
      // accessor id has no hit in data
      expect(
        getStaticValue(
          [{ layerId: 'id-a', seriesType: 'area' } as XYDataLayerConfig], // missing xAccessor for groupId == x
          'x',
          {
            activeData: getActiveData([
              { id: 'id-a', rows: Array(3).fill({ a: 100, b: 100, c: 100 }) },
            ]),
          },
          hasAllNumberHistogram
        )
      ).toBe(100);
      expect(
        getStaticValue(
          [
            {
              layerId: 'id-a',
              seriesType: 'area',
              layerType: 'data',
              accessors: ['d'],
            } as XYDataLayerConfig,
          ], // missing hit of accessor "d" in data
          'yLeft',
          {
            activeData: getActiveData([
              { id: 'id-a', rows: Array(3).fill({ a: 100, b: 100, c: 100 }) },
            ]),
          },
          hasAllNumberHistogram
        )
      ).toBe(100);
      expect(
        getStaticValue(
          [
            {
              layerId: 'id-a',
              seriesType: 'area',
              layerType: 'data',
              accessors: ['a'],
            } as XYDataLayerConfig,
          ], // missing yConfig fallbacks to left axis, but the requested group is yRight
          'yRight',
          {
            activeData: getActiveData([
              { id: 'id-a', rows: Array(3).fill({ a: 100, b: 100, c: 100 }) },
            ]),
          },
          hasAllNumberHistogram
        )
      ).toBe(100);
      expect(
        getStaticValue(
          [
            {
              layerId: 'id-a',
              seriesType: 'area',
              layerType: 'data',
              accessors: ['a'],
            } as XYDataLayerConfig,
          ], // same as above with x groupId
          'x',
          {
            activeData: getActiveData([
              { id: 'id-a', rows: Array(3).fill({ a: 100, b: 100, c: 100 }) },
            ]),
          },
          hasAllNumberHistogram
        )
      ).toBe(100);
    });

    it('should return 0 as result of calculation', () => {
      expect(
        getStaticValue(
          [
            {
              layerId: 'id-a',
              seriesType: 'area',
              layerType: 'data',
              accessors: ['a'],
              yConfig: [{ forAccessor: 'a', axisMode: 'right' }],
            } as XYDataLayerConfig,
          ],
          'yRight',
          {
            activeData: getActiveData([
              {
                id: 'id-a',
                rows: [{ a: -30 }, { a: 10 }],
              },
            ]),
          },
          hasAllNumberHistogram
        )
      ).toBe(0);
    });

    it('should work for no yConfig defined and fallback to left axis', () => {
      expect(
        getStaticValue(
          [
            {
              layerId: 'id-a',
              seriesType: 'area',
              layerType: 'data',
              accessors: ['a'],
            } as XYDataLayerConfig,
          ],
          'yLeft',
          {
            activeData: getActiveData([
              { id: 'id-a', rows: Array(3).fill({ a: 100, b: 100, c: 100 }) },
            ]),
          },
          hasAllNumberHistogram
        )
      ).toBe(75); // 3/4 of "a" only
    });

    it('should extract axis side from yConfig', () => {
      expect(
        getStaticValue(
          [
            {
              layerId: 'id-a',
              seriesType: 'area',
              layerType: 'data',
              accessors: ['a'],
              yConfig: [{ forAccessor: 'a', axisMode: 'right' }],
            } as XYDataLayerConfig,
          ],
          'yRight',
          {
            activeData: getActiveData([
              { id: 'id-a', rows: Array(3).fill({ a: 100, b: 100, c: 100 }) },
            ]),
          },
          hasAllNumberHistogram
        )
      ).toBe(75); // 3/4 of "a" only
    });

    it('should correctly distribute axis on left and right with different formatters when in auto', () => {
      const tables = getActiveData([
        { id: 'id-a', rows: Array(3).fill({ a: 100, b: 200, c: 100 }) },
      ]);
      tables['id-a'].columns[0].meta.params = { id: 'number' }; // a: number formatter
      tables['id-a'].columns[1].meta.params = { id: 'percent' }; // b: percent formatter
      expect(
        getStaticValue(
          [
            {
              layerId: 'id-a',
              seriesType: 'area',
              layerType: 'data',
              accessors: ['a', 'b'],
            } as XYDataLayerConfig,
          ],
          'yLeft',
          { activeData: tables },
          hasAllNumberHistogram
        )
      ).toBe(75); // 3/4 of "a" only
      expect(
        getStaticValue(
          [
            {
              layerId: 'id-a',
              seriesType: 'area',
              layerType: 'data',
              accessors: ['a', 'b'],
            } as XYDataLayerConfig,
          ],
          'yRight',
          { activeData: tables },
          hasAllNumberHistogram
        )
      ).toBe(150); // 3/4 of "b" only
    });

    it('should ignore hasHistogram for left or right axis', () => {
      const tables = getActiveData([
        { id: 'id-a', rows: Array(3).fill({ a: 100, b: 200, c: 100 }) },
      ]);
      tables['id-a'].columns[0].meta.params = { id: 'number' }; // a: number formatter
      tables['id-a'].columns[1].meta.params = { id: 'percent' }; // b: percent formatter
      expect(
        getStaticValue(
          [
            {
              layerId: 'id-a',
              seriesType: 'area',
              layerType: 'data',
              accessors: ['a', 'b'],
            } as XYDataLayerConfig,
          ],
          'yLeft',
          { activeData: tables },
          hasDateHistogram
        )
      ).toBe(75); // 3/4 of "a" only
      expect(
        getStaticValue(
          [
            {
              layerId: 'id-a',
              seriesType: 'area',
              layerType: 'data',
              accessors: ['a', 'b'],
            } as XYDataLayerConfig,
          ],
          'yRight',
          { activeData: tables },
          hasDateHistogram
        )
      ).toBe(150); // 3/4 of "b" only
    });

    it('should early exit for x group if a date histogram is detected', () => {
      expect(
        getStaticValue(
          [
            {
              layerId: 'id-a',
              seriesType: 'area',
              layerType: 'data',
              xAccessor: 'a',
              accessors: [],
            } as XYDataLayerConfig,
          ],
          'x', // this is influenced by the callback
          {
            activeData: getActiveData([
              { id: 'id-a', rows: Array(3).fill({ a: 100, b: 100, c: 100 }) },
            ]),
          },
          hasDateHistogram
        )
      ).toBe(100);
    });

    it('should not force zero-based interval for x group', () => {
      expect(
        getStaticValue(
          [
            {
              layerId: 'id-a',
              seriesType: 'area',
              layerType: 'data',
              xAccessor: 'a',
              accessors: [],
            } as XYDataLayerConfig,
          ],
          'x',
          {
            activeData: getActiveData([
              {
                id: 'id-a',
                rows: Array(3)
                  .fill(1)
                  .map((_, i) => ({ a: i % 2 ? 33 : 50 })),
              },
            ]),
          },
          hasAllNumberHistogram
        )
      ).toBe(45.75); // 33 (min) + (50 - 33) * 3/4
    });
  });

  describe('computeOverallDataDomain', () => {
    it('should compute the correct value for a single layer with stacked series', () => {
      for (const seriesType of ['bar_stacked', 'bar_horizontal_stacked', 'area_stacked'])
        expect(
          computeOverallDataDomain(
            [{ layerId: 'id-a', seriesType, accessors: ['a', 'b', 'c'] } as XYDataLayerConfig],
            ['a', 'b', 'c'],
            getActiveData([
              {
                id: 'id-a',
                rows: Array(3)
                  .fill(1)
                  .map((_, i) => ({
                    a: i === 0 ? 25 : null,
                    b: i === 1 ? 50 : null,
                    c: i === 2 ? 75 : null,
                  })),
              },
            ])
          )
        ).toEqual({ min: 0, max: 150 }); // there's just one series with 150, so the lowerbound fallbacks to 0
    });

    it('should work for percentage series', () => {
      for (const seriesType of [
        'bar_percentage_stacked',
        'bar_horizontal_percentage_stacked',
        'area_percentage_stacked',
      ])
        expect(
          computeOverallDataDomain(
            [{ layerId: 'id-a', seriesType, accessors: ['a', 'b', 'c'] } as XYDataLayerConfig],
            ['a', 'b', 'c'],
            getActiveData([
              {
                id: 'id-a',
                rows: Array(3)
                  .fill(1)
                  .map((_, i) => ({
                    a: i === 0 ? 0.25 : null,
                    b: i === 1 ? 0.25 : null,
                    c: i === 2 ? 0.25 : null,
                  })),
              },
            ])
          )
        ).toEqual({ min: 0, max: 0.75 });
    });

    it('should compute the correct value for multiple layers with stacked series', () => {
      for (const seriesType of ['bar_stacked', 'bar_horizontal_stacked', 'area_stacked']) {
        expect(
          computeOverallDataDomain(
            [
              { layerId: 'id-a', seriesType, accessors: ['a', 'b', 'c'] },
              { layerId: 'id-b', seriesType, accessors: ['d', 'e', 'f'] },
            ] as XYDataLayerConfig[],
            ['a', 'b', 'c', 'd', 'e', 'f'],
            getActiveData([
              { id: 'id-a', rows: [{ a: 25, b: 100, c: 100 }] },
              { id: 'id-b', rows: [{ d: 50, e: 50, f: 50 }] },
            ])
          )
        ).toEqual({ min: 0, max: 375 });
        // same as before but spread on 3 rows with nulls
        expect(
          computeOverallDataDomain(
            [
              { layerId: 'id-a', seriesType, accessors: ['a', 'b', 'c'] },
              { layerId: 'id-b', seriesType, accessors: ['d', 'e', 'f'] },
            ] as XYDataLayerConfig[],
            ['a', 'b', 'c', 'd', 'e', 'f'],
            getActiveData([
              {
                id: 'id-a',
                rows: Array(3)
                  .fill(1)
                  .map((_, i) => ({
                    a: i === 0 ? 25 : null,
                    b: i === 1 ? 100 : null,
                    c: i === 2 ? 100 : null,
                  })),
              },
              {
                id: 'id-b',
                rows: Array(3)
                  .fill(1)
                  .map((_, i) => ({
                    d: i === 0 ? 50 : null,
                    e: i === 1 ? 50 : null,
                    f: i === 2 ? 50 : null,
                  })),
              },
            ])
          )
        ).toEqual({ min: 0, max: 375 });
      }
    });

    it('should compute the correct value for multiple layers with non-stacked series', () => {
      for (const seriesType of ['bar', 'bar_horizontal', 'line', 'area'])
        expect(
          computeOverallDataDomain(
            [
              { layerId: 'id-a', seriesType, accessors: ['a', 'b', 'c'] },
              { layerId: 'id-b', seriesType, accessors: ['d', 'e', 'f'] },
            ] as XYDataLayerConfig[],
            ['a', 'b', 'c', 'd', 'e', 'f'],
            getActiveData([
              { id: 'id-a', rows: Array(3).fill({ a: 100, b: 100, c: 100 }) },
              { id: 'id-b', rows: Array(3).fill({ d: 50, e: 50, f: 50 }) },
            ])
          )
        ).toEqual({ min: 50, max: 100 });
    });

    it('should compute the correct value for mixed series (stacked + non-stacked)', () => {
      for (const nonStackedSeries of ['bar', 'bar_horizontal', 'line', 'area']) {
        for (const stackedSeries of ['bar_stacked', 'bar_horizontal_stacked', 'area_stacked']) {
          expect(
            computeOverallDataDomain(
              [
                { layerId: 'id-a', seriesType: nonStackedSeries, accessors: ['a', 'b', 'c'] },
                { layerId: 'id-b', seriesType: stackedSeries, accessors: ['d', 'e', 'f'] },
              ] as XYDataLayerConfig[],
              ['a', 'b', 'c', 'd', 'e', 'f'],
              getActiveData([
                { id: 'id-a', rows: [{ a: 100, b: 100, c: 100 }] },
                { id: 'id-b', rows: [{ d: 50, e: 50, f: 50 }] },
              ])
            )
          ).toEqual({
            min: 0, // min is 0 as there is at least one stacked series
            max: 150, // max is id-b layer accessor sum
          });
        }
      }
    });

    it('should compute the correct value for a histogram stacked chart', () => {
      for (const seriesType of ['bar_stacked', 'bar_horizontal_stacked', 'area_stacked'])
        expect(
          computeOverallDataDomain(
            [
              { layerId: 'id-a', seriesType, xAccessor: 'c', accessors: ['a', 'b'] },
              { layerId: 'id-b', seriesType, xAccessor: 'f', accessors: ['d', 'e'] },
            ] as XYDataLayerConfig[],
            ['a', 'b', 'd', 'e'],
            getActiveData([
              {
                id: 'id-a',
                rows: Array(3)
                  .fill(1)
                  .map((_, i) => ({ a: 50 * i, b: 100 * i, c: i })),
              },
              {
                id: 'id-b',
                rows: Array(3)
                  .fill(1)
                  .map((_, i) => ({ d: 25 * (i + 1), e: i % 2 ? 100 : null, f: i })),
              },
            ])
          )
        ).toEqual({ min: 0, max: 375 });
    });

    it('should compute the correct value for a histogram on stacked chart for the xAccessor', () => {
      for (const seriesType of ['bar_stacked', 'bar_horizontal_stacked', 'area_stacked'])
        expect(
          computeOverallDataDomain(
            [
              { layerId: 'id-a', seriesType, accessors: ['c'] },
              { layerId: 'id-b', seriesType, accessors: ['f'] },
            ] as XYDataLayerConfig[],
            ['c', 'f'],
            getActiveData([
              {
                id: 'id-a',
                rows: Array(3)
                  .fill(1)
                  .map((_, i) => ({ a: 50 * i, b: 100 * i, c: i })),
              },
              {
                id: 'id-b',
                rows: Array(3)
                  .fill(1)
                  .map((_, i) => ({ d: 25 * (i + 1), e: i % 2 ? 100 : null, f: i })),
              },
            ]),
            false // this will avoid the stacking behaviour
          )
        ).toEqual({ min: 0, max: 2 });
    });

    it('should compute the correct value for a histogram non-stacked chart', () => {
      for (const seriesType of ['bar', 'bar_horizontal', 'line', 'area'])
        expect(
          computeOverallDataDomain(
            [
              { layerId: 'id-a', seriesType, xAccessor: 'c', accessors: ['a', 'b'] },
              { layerId: 'id-b', seriesType, xAccessor: 'f', accessors: ['d', 'e'] },
            ] as XYDataLayerConfig[],
            ['a', 'b', 'd', 'e'],
            getActiveData([
              {
                id: 'id-a',
                rows: Array(3)
                  .fill(1)
                  .map((_, i) => ({ a: 50 * i, b: 100 * i, c: i })),
              },
              {
                id: 'id-b',
                rows: Array(3)
                  .fill(1)
                  .map((_, i) => ({ d: 25 * (i + 1), e: i % 2 ? 100 : null, f: i })),
              },
            ])
          )
        ).toEqual({ min: 0, max: 200 });
    });

    it('should compute the result taking into consideration negative-based intervals too', () => {
      // stacked
      expect(
        computeOverallDataDomain(
          [
            {
              layerId: 'id-a',
              seriesType: 'area_stacked',
              accessors: ['a', 'b', 'c'],
            } as XYDataLayerConfig,
          ],
          ['a', 'b', 'c'],
          getActiveData([
            {
              id: 'id-a',
              rows: Array(3)
                .fill(1)
                .map((_, i) => ({
                  a: i === 0 ? -100 : null,
                  b: i === 1 ? 200 : null,
                  c: i === 2 ? 100 : null,
                })),
            },
          ])
        )
      ).toEqual({ min: 0, max: 200 }); // it is stacked, so max is the sum and 0 is the fallback
      expect(
        computeOverallDataDomain(
          [
            {
              layerId: 'id-a',
              seriesType: 'area',
              accessors: ['a', 'b', 'c'],
            } as XYDataLayerConfig,
          ],
          ['a', 'b', 'c'],
          getActiveData([
            {
              id: 'id-a',
              rows: Array(3)
                .fill(1)
                .map((_, i) => ({
                  a: i === 0 ? -100 : null,
                  b: i === 1 ? 200 : null,
                  c: i === 2 ? 100 : null,
                })),
            },
          ])
        )
      ).toEqual({ min: -100, max: 200 });
    });

    it('should return no result if no layers or accessors are passed', () => {
      expect(
        computeOverallDataDomain(
          [],
          ['a', 'b', 'c'],
          getActiveData([{ id: 'id-a', rows: Array(3).fill({ a: 100, b: 100, c: 100 }) }])
        )
      ).toEqual({ min: undefined, max: undefined });
    });

    it('should return no result if data or table is not available', () => {
      expect(
        computeOverallDataDomain(
          [
            { layerId: 'id-a', seriesType: 'area', accessors: ['a', 'b', 'c'] },
            { layerId: 'id-b', seriesType: 'line', accessors: ['d', 'e', 'f'] },
          ] as XYDataLayerConfig[],
          ['a', 'b'],
          getActiveData([{ id: 'id-c', rows: [{ a: 100, b: 100 }] }]) // mind the layer id here
        )
      ).toEqual({ min: undefined, max: undefined });

      expect(
        computeOverallDataDomain(
          [
            { layerId: 'id-a', seriesType: 'bar', accessors: ['a', 'b', 'c'] },
            { layerId: 'id-b', seriesType: 'bar_stacked' },
          ] as XYDataLayerConfig[],
          ['a', 'b'],
          getActiveData([])
        )
      ).toEqual({ min: undefined, max: undefined });
    });
  });
});
