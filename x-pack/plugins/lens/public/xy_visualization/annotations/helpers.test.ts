/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FramePublicAPI } from '../../types';
import { getStaticDate } from './helpers';

const frame = {
  datasourceLayers: {},
  dateRange: { fromDate: '2022-02-01T00:00:00.000Z', toDate: '2022-04-20T00:00:00.000Z' },
};

describe('annotations helpers', () => {
  describe('getStaticDate', () => {
    it('should return the middle of the date range on when nothing is configured', () => {
      expect(getStaticDate([], frame)).toBe('2022-03-12T00:00:00.000Z');
    });
    it('should return the middle of the date range value on when there is no active data', () => {
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
          frame
        )
      ).toBe('2022-03-12T00:00:00.000Z');
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
          {
            ...frame,
            activeData: activeData as FramePublicAPI['activeData'],
          }
        )
      ).toBe('2022-02-27T23:00:00.000Z');
    });

    it('should return the middle of the date range value on when there the active data lies outside of the timerange (auto apply off case)', () => {
      const activeData = {
        layerId: {
          type: 'datatable',
          rows: [
            {
              a: 1642673600000, // smaller than dateRange.fromDate
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
          {
            ...frame,
            activeData: activeData as FramePublicAPI['activeData'],
          }
        )
      ).toBe('2022-03-12T00:00:00.000Z');
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
          {
            ...frame,
            activeData: activeData as FramePublicAPI['activeData'],
          }
        )
      ).toBe('2022-03-26T05:00:00.000Z');
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
          {
            ...frame,
            dateRange: { fromDate: '2020-02-01T00:00:00.000Z', toDate: '2022-09-20T00:00:00.000Z' },
            activeData: activeData as FramePublicAPI['activeData'],
          }
        )
      ).toBe('2020-08-24T12:06:40.000Z');
    });
  });
});
