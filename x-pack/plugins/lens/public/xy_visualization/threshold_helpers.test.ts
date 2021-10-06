/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { XYLayerConfig } from '../../common/expressions';
import { FramePublicAPI } from '../types';
import { computeStaticValueForGroup, getStaticValue } from './threshold_helpers';

describe('threshold helpers', () => {
  describe('getStaticValue', () => {
    function getActiveData(json: Array<{ id: string; rows: Array<Record<string, number>> }>) {
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
          [{ layerId: 'id-a', seriesType: 'area' } as XYLayerConfig], // missing xAccessor for groupId == x
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
            } as XYLayerConfig,
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
            } as XYLayerConfig,
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
            } as XYLayerConfig,
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

    it('should work for no yConfig defined and fallback to left axis', () => {
      expect(
        getStaticValue(
          [
            {
              layerId: 'id-a',
              seriesType: 'area',
              layerType: 'data',
              accessors: ['a'],
            } as XYLayerConfig,
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
            } as XYLayerConfig,
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
            } as XYLayerConfig,
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
            } as XYLayerConfig,
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
            } as XYLayerConfig,
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
            } as XYLayerConfig,
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
            } as XYLayerConfig,
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
            } as XYLayerConfig,
          ],
          'x',
          {
            activeData: getActiveData([
              {
                id: 'id-a',
                rows: Array(3)
                  .fill({ a: 100 })
                  .map((_, i) => ({ a: i % 2 ? 33 : 50 })),
              },
            ]),
          },
          hasAllNumberHistogram
        )
      ).toBe(45.75); // 33 (min) + (50 - 33) * 3/4
    });

    describe('computeStaticValueForGroup', () => {
      it('should compute the correct value for a single stacked series', () => {
        for (const seriesType of ['bar_stacked', 'bar_horizontal_stacked', 'area_stacked'])
          expect(
            computeStaticValueForGroup(
              [{ layerId: 'id-a', seriesType } as XYLayerConfig],
              ['a', 'b', 'c'],
              getActiveData([{ id: 'id-a', rows: Array(3).fill({ a: 100, b: 100, c: 100 }) }])
            )
          ).toBe(225);
      });

      it("should return 0.75 if there's at least one percentage series", () => {
        for (const seriesType of [
          'bar_percentage_stacked',
          'bar_horizontal_percentage_stacked',
          'area_percentage_stacked',
        ])
          expect(
            computeStaticValueForGroup(
              [{ layerId: 'id-a', seriesType } as XYLayerConfig],
              ['a', 'b', 'c'],
              getActiveData([{ id: 'id-a', rows: Array(3).fill({ a: 0.5, b: 0.25, c: 0.25 }) }])
            )
          ).toBe(0.75);
      });

      it('should compute the correct value for multiple stacked series', () => {
        for (const seriesType of ['bar_stacked', 'bar_horizontal_stacked', 'area_stacked'])
          expect(
            computeStaticValueForGroup(
              [
                { layerId: 'id-a', seriesType },
                { layerId: 'id-b', seriesType },
              ] as XYLayerConfig[],
              ['a', 'b', 'c'],
              getActiveData([
                { id: 'id-a', rows: Array(3).fill({ a: 100, b: 100, c: 100 }) },
                { id: 'id-b', rows: Array(3).fill({ a: 50, b: 50, c: 50 }) },
              ])
            )
          ).toBe(225);
      });

      it('should compute the correct value for multiple non-stacked series', () => {
        for (const seriesType of ['bar', 'bar_horizontal', 'line', 'area'])
          expect(
            computeStaticValueForGroup(
              [
                { layerId: 'id-a', seriesType },
                { layerId: 'id-b', seriesType },
              ] as XYLayerConfig[],
              ['a', 'b', 'c'],
              getActiveData([
                { id: 'id-a', rows: Array(3).fill({ a: 100, b: 100, c: 100 }) },
                { id: 'id-b', rows: Array(3).fill({ a: 50, b: 50, c: 50 }) },
              ])
            )
          ).toBe(75);
      });

      it('should compute the correct value for mixed series (stacked + non-stacked)', () => {
        for (const nonStackedSeries of ['bar', 'bar_horizontal', 'line', 'area']) {
          for (const stackedSeries of ['bar_stacked', 'bar_horizontal_stacked', 'area_stacked']) {
            expect(
              computeStaticValueForGroup(
                [
                  { layerId: 'id-a', seriesType: nonStackedSeries },
                  { layerId: 'id-b', seriesType: stackedSeries },
                ] as XYLayerConfig[],
                ['a', 'b', 'c'],
                getActiveData([
                  { id: 'id-a', rows: Array(3).fill({ a: 100, b: 100, c: 100 }) },
                  { id: 'id-b', rows: Array(3).fill({ a: 50, b: 50, c: 50 }) },
                ])
              )
            ).toBe((3 * 150) / 4); // 50 stacked 3 times * 3/4
          }
        }
      });

      it('should compute the result not taking into consideration zero-based intervals', () => {
        // stacked
        expect(
          computeStaticValueForGroup(
            [{ layerId: 'id-a', seriesType: 'area_stacked' }] as XYLayerConfig[],
            ['a', 'b', 'c'],
            getActiveData([
              {
                id: 'id-a',
                rows: Array(3)
                  .fill(1)
                  .map((_, i) => ({ a: i % 2 ? 33 : 50, b: 100, c: 100 })),
              },
            ]),
            false
          )
        ).toBe(245.75);
        // non stacked
        expect(
          computeStaticValueForGroup(
            [{ layerId: 'id-a', seriesType: 'area' }] as XYLayerConfig[],
            ['a', 'b', 'c'],
            getActiveData([
              {
                id: 'id-a',
                rows: Array(3)
                  .fill(1)
                  .map((_, i) => ({ a: i % 2 ? 33 : 50, b: 100, c: 100 })),
              },
            ]),
            false
          )
        ).toBe(83.25);
      });

      it('should compute the result taking into consideration negative-based intervals too', () => {
        // stacked
        expect(
          computeStaticValueForGroup(
            [{ layerId: 'id-a', seriesType: 'area_stacked' } as XYLayerConfig],
            ['a', 'b', 'c'],
            getActiveData([{ id: 'id-a', rows: Array(3).fill({ a: -100, b: 200, c: 100 }) }])
          )
        ).toBe(150); // 3/4 * 200
        // non stacked
        expect(
          computeStaticValueForGroup(
            [{ layerId: 'id-a', seriesType: 'area' } as XYLayerConfig],
            ['a', 'b', 'c'],
            getActiveData([{ id: 'id-a', rows: Array(3).fill({ a: -100, b: 200, c: 100 }) }])
          )
        ).toBe(125); // (3/4 * 300) - 100
      });

      it('should return no result if no layers or accessors are passed', () => {
        expect(
          computeStaticValueForGroup(
            [],
            ['a', 'b', 'c'],
            getActiveData([{ id: 'id-a', rows: Array(3).fill({ a: 100, b: 100, c: 100 }) }])
          )
        ).toBe(undefined);
      });

      it('should return no result if data or table is not available', () => {
        expect(
          computeStaticValueForGroup(
            [
              { layerId: 'id-a', seriesType: 'area' },
              { layerId: 'id-b', seriesType: 'line' },
            ] as XYLayerConfig[],
            ['a', 'b'],
            getActiveData([{ id: 'id-c', rows: Array(3).fill({ a: 100, b: 100 }) }])
          )
        ).toBe(undefined);

        expect(
          computeStaticValueForGroup(
            [
              { layerId: 'id-a', seriesType: 'bar' },
              { layerId: 'id-b', seriesType: 'bar_stacked' },
            ] as XYLayerConfig[],
            ['a', 'b'],
            getActiveData([])
          )
        ).toBe(undefined);
      });
    });
  });
});
