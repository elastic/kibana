/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FramePublicAPI } from '../../types';
import { getStaticDate } from './helpers';

describe('annotations helpers', () => {
  describe('getStaticDate', () => {
    it('should return `now` value on when nothing is configured', () => {
      jest.spyOn(Date, 'now').mockReturnValue(new Date('2022-04-08T11:01:58.135Z').valueOf());
      expect(getStaticDate([], undefined)).toBe(1649415718135);
    });
    it('should return `now` value on when there is no active data', () => {
      expect(
        getStaticDate(
          [
            {
              layerId: 'layerId',
              accessors: ['b'],
              seriesType: 'bar_stacked',
              layerType: 'data',
              xAccessor: 'a',
            },
          ],
          undefined
        )
      ).toBe(1649415718135);
    });

    it('should return timestamp value for single active data point', () => {
      const activeData = {
        layerId: {
          type: 'datatable',
          rows: [
            {
              a: 1646002800000,
              b: 1050,
            },
          ],
          columns: [
            {
              id: 'a',
              name: 'order_date per week',
              meta: { type: 'date' },
            },
            {
              id: 'b',
              name: 'Count of records',
              meta: { type: 'number', params: { id: 'number' } },
            },
          ],
        },
      };
      expect(
        getStaticDate(
          [
            {
              layerId: 'layerId',
              accessors: ['b'],
              seriesType: 'bar_stacked',
              layerType: 'data',
              xAccessor: 'a',
            },
          ],
          activeData as FramePublicAPI['activeData']
        )
      ).toBe(1646002800000);
    });

    it('should correctly calculate middle value for active data', () => {
      const activeData = {
        layerId: {
          type: 'datatable',
          rows: [
            {
              a: 1648206000000,
              b: 19,
            },
            {
              a: 1648249200000,
              b: 73,
            },
            {
              a: 1648292400000,
              b: 69,
            },
            {
              a: 1648335600000,
              b: 7,
            },
          ],
          columns: [
            {
              id: 'a',
              name: 'order_date per week',
              meta: { type: 'date' },
            },
            {
              id: 'b',
              name: 'Count of records',
              meta: { type: 'number', params: { id: 'number' } },
            },
          ],
        },
      };
      expect(
        getStaticDate(
          [
            {
              layerId: 'layerId',
              accessors: ['b'],
              seriesType: 'bar_stacked',
              layerType: 'data',
              xAccessor: 'a',
            },
          ],
          activeData as FramePublicAPI['activeData']
        )
      ).toBe(1648270800000);
    });

    it('should calculate middle date point correctly for multiple layers', () => {
      const activeData = {
        layerId: {
          type: 'datatable',
          rows: [
            {
              a: 1648206000000,
              b: 19,
            },
            {
              a: 1648249200000,
              b: 73,
            },
            {
              a: 1648292400000,
              b: 69,
            },
            {
              a: 1648335600000,
              b: 7,
            },
          ],
          columns: [
            {
              id: 'a',
              name: 'order_date per week',
              meta: { type: 'date' },
            },
            {
              id: 'b',
              name: 'Count of records',
              meta: { type: 'number', params: { id: 'number' } },
            },
          ],
        },
        layerId2: {
          type: 'datatable',
          rows: [
            {
              d: 1548206000000,
              c: 19,
            },
            {
              d: 1548249200000,
              c: 73,
            },
          ],
          columns: [
            {
              id: 'd',
              name: 'order_date per week',
              meta: { type: 'date' },
            },
            {
              id: 'c',
              name: 'Count of records',
              meta: { type: 'number', params: { id: 'number' } },
            },
          ],
        },
      };
      expect(
        getStaticDate(
          [
            {
              layerId: 'layerId',
              accessors: ['b'],
              seriesType: 'bar_stacked',
              layerType: 'data',
              xAccessor: 'a',
            },
            {
              layerId: 'layerId2',
              accessors: ['c'],
              seriesType: 'bar_stacked',
              layerType: 'data',
              xAccessor: 'd',
            },
          ],
          activeData as FramePublicAPI['activeData']
        )
      ).toBe(1598270800000);
    });
  });
});
