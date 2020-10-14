/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import dateMath from '@elastic/datemath';
import moment from 'moment';

import { EqlSearchStrategyResponse } from '../../../../../data_enhanced/common';
import { Source } from './types';
import { EqlSearchResponse } from '../../../../common/detection_engine/types';
import { inputsModel } from '../../../common/store';

import {
  calculateBucketForHour,
  calculateBucketForDay,
  getEqlAggsData,
  createIntervalArray,
  getInterval,
  getSequenceAggs,
} from './helpers';

export const getMockResponse = (): EqlSearchStrategyResponse<EqlSearchResponse<Source>> =>
  ({
    id: 'some-id',
    rawResponse: {
      body: {
        hits: {
          events: [
            {
              _index: 'index',
              _id: '1',
              _source: {
                '@timestamp': '2020-10-04T15:16:54.368707900Z',
              },
            },
            {
              _index: 'index',
              _id: '2',
              _source: {
                '@timestamp': '2020-10-04T15:50:54.368707900Z',
              },
            },
            {
              _index: 'index',
              _id: '3',
              _source: {
                '@timestamp': '2020-10-04T15:06:54.368707900Z',
              },
            },
            {
              _index: 'index',
              _id: '4',
              _source: {
                '@timestamp': '2020-10-04T15:15:54.368707900Z',
              },
            },
          ],
          total: {
            value: 4,
            relation: '',
          },
        },
      },
      meta: {
        request: {
          params: {
            method: 'GET',
            path: '/_eql/search/',
          },
          options: {},
          id: '',
        },
      },
      statusCode: 200,
    },
  } as EqlSearchStrategyResponse<EqlSearchResponse<Source>>);

const getMockSequenceResponse = (): EqlSearchStrategyResponse<EqlSearchResponse<Source>> =>
  (({
    id: 'some-id',
    rawResponse: {
      body: {
        hits: {
          sequences: [
            {
              join_keys: [],
              events: [
                {
                  _index: 'index',
                  _id: '1',
                  _source: {
                    '@timestamp': '2020-10-04T15:16:54.368707900Z',
                  },
                },
                {
                  _index: 'index',
                  _id: '2',
                  _source: {
                    '@timestamp': '2020-10-04T15:50:54.368707900Z',
                  },
                },
              ],
            },
            {
              join_keys: [],
              events: [
                {
                  _index: 'index',
                  _id: '3',
                  _source: {
                    '@timestamp': '2020-10-04T15:06:54.368707900Z',
                  },
                },
                {
                  _index: 'index',
                  _id: '4',
                  _source: {
                    '@timestamp': '2020-10-04T15:15:54.368707900Z',
                  },
                },
              ],
            },
          ],
          total: {
            value: 4,
            relation: '',
          },
        },
      },
      meta: {
        request: {
          params: {
            body: JSON.stringify({
              filter: {
                range: {
                  '@timestamp': {
                    gte: '2020-10-07T00:46:12.414Z',
                    lte: '2020-10-07T01:46:12.414Z',
                    format: 'strict_date_optional_time',
                  },
                },
              },
            }),
            method: 'GET',
            path: '/_eql/search/',
          },
          options: {},
          id: '',
        },
      },
      statusCode: 200,
    },
  } as unknown) as EqlSearchStrategyResponse<EqlSearchResponse<Source>>);

describe('eql/helpers', () => {
  describe('calculateBucketForHour', () => {
    test('returns 2 if event occurred within 2 minutes of "now"', () => {
      const diff = calculateBucketForHour(
        Number(dateMath.parse('now-1m')?.format('x')),
        Number(dateMath.parse('now')?.format('x'))
      );

      expect(diff).toEqual(2);
    });

    test('returns 10 if event occurred within 8-10 minutes of "now"', () => {
      const diff = calculateBucketForHour(
        Number(dateMath.parse('now-9m')?.format('x')),
        Number(dateMath.parse('now')?.format('x'))
      );

      expect(diff).toEqual(10);
    });

    test('returns 16 if event occurred within 10-15 minutes of "now"', () => {
      const diff = calculateBucketForHour(
        Number(dateMath.parse('now-15m')?.format('x')),
        Number(dateMath.parse('now')?.format('x'))
      );

      expect(diff).toEqual(16);
    });

    test('returns 60 if event occurred within 58-60 minutes of "now"', () => {
      const diff = calculateBucketForHour(
        Number(dateMath.parse('now-59m')?.format('x')),
        Number(dateMath.parse('now')?.format('x'))
      );

      expect(diff).toEqual(60);
    });

    test('returns exact time difference if it is a multiple of 2', () => {
      const diff = calculateBucketForHour(
        Number(dateMath.parse('now-20m')?.format('x')),
        Number(dateMath.parse('now')?.format('x'))
      );

      expect(diff).toEqual(20);
    });

    test('returns 0 if times are equal', () => {
      const diff = calculateBucketForHour(
        Number(dateMath.parse('now')?.format('x')),
        Number(dateMath.parse('now')?.format('x'))
      );

      expect(diff).toEqual(0);
    });
  });

  describe('calculateBucketForDay', () => {
    test('returns 0 if two dates are equivalent', () => {
      const diff = calculateBucketForDay(
        Number(dateMath.parse('now')?.format('x')),
        Number(dateMath.parse('now')?.format('x'))
      );

      expect(diff).toEqual(0);
    });

    test('returns 1 if event occurred within 60 minutes of "now"', () => {
      const diff = calculateBucketForDay(
        Number(dateMath.parse('now-40m')?.format('x')),
        Number(dateMath.parse('now')?.format('x'))
      );

      expect(diff).toEqual(1);
    });

    test('returns 2 if event occurred 60-120 minutes from "now"', () => {
      const diff = calculateBucketForDay(
        Number(dateMath.parse('now-120m')?.format('x')),
        Number(dateMath.parse('now')?.format('x'))
      );

      expect(diff).toEqual(2);
    });

    test('returns 3 if event occurred 120-180 minutes from "now', () => {
      const diff = calculateBucketForDay(
        Number(dateMath.parse('now-121m')?.format('x')),
        Number(dateMath.parse('now')?.format('x'))
      );

      expect(diff).toEqual(3);
    });

    test('returns 4 if event occurred 180-240 minutes from "now', () => {
      const diff = calculateBucketForDay(
        Number(dateMath.parse('now-220m')?.format('x')),
        Number(dateMath.parse('now')?.format('x'))
      );

      expect(diff).toEqual(4);
    });
  });

  describe('getEqlAggsData', () => {
    test('it returns results bucketed into 2 min intervals when range is "h"', () => {
      const mockResponse = getMockResponse();

      const aggs = getEqlAggsData(
        mockResponse,
        'h',
        '2020-10-04T16:00:00.368707900Z',
        jest.fn() as inputsModel.Refetch
      );

      const date1 = moment(aggs.data[0].x);
      const date2 = moment(aggs.data[1].x);
      // This'll be in ms
      const diff = date1.diff(date2);

      expect(diff).toEqual(120000);
      expect(aggs.data).toHaveLength(31);
      expect(aggs.data).toEqual([
        { g: 'hits', x: 1601827200368, y: 0 },
        { g: 'hits', x: 1601827080368, y: 0 },
        { g: 'hits', x: 1601826960368, y: 0 },
        { g: 'hits', x: 1601826840368, y: 0 },
        { g: 'hits', x: 1601826720368, y: 0 },
        { g: 'hits', x: 1601826600368, y: 1 },
        { g: 'hits', x: 1601826480368, y: 0 },
        { g: 'hits', x: 1601826360368, y: 0 },
        { g: 'hits', x: 1601826240368, y: 0 },
        { g: 'hits', x: 1601826120368, y: 0 },
        { g: 'hits', x: 1601826000368, y: 0 },
        { g: 'hits', x: 1601825880368, y: 0 },
        { g: 'hits', x: 1601825760368, y: 0 },
        { g: 'hits', x: 1601825640368, y: 0 },
        { g: 'hits', x: 1601825520368, y: 0 },
        { g: 'hits', x: 1601825400368, y: 0 },
        { g: 'hits', x: 1601825280368, y: 0 },
        { g: 'hits', x: 1601825160368, y: 0 },
        { g: 'hits', x: 1601825040368, y: 0 },
        { g: 'hits', x: 1601824920368, y: 0 },
        { g: 'hits', x: 1601824800368, y: 0 },
        { g: 'hits', x: 1601824680368, y: 0 },
        { g: 'hits', x: 1601824560368, y: 2 },
        { g: 'hits', x: 1601824440368, y: 0 },
        { g: 'hits', x: 1601824320368, y: 0 },
        { g: 'hits', x: 1601824200368, y: 0 },
        { g: 'hits', x: 1601824080368, y: 0 },
        { g: 'hits', x: 1601823960368, y: 1 },
        { g: 'hits', x: 1601823840368, y: 0 },
        { g: 'hits', x: 1601823720368, y: 0 },
        { g: 'hits', x: 1601823600368, y: 0 },
      ]);
    });

    test('it returns results bucketed into 1 hour intervals when range is "d"', () => {
      const mockResponse = getMockResponse();
      const response = {
        ...mockResponse,
        rawResponse: {
          ...mockResponse.rawResponse,
          body: {
            is_partial: false,
            is_running: false,
            timed_out: false,
            took: 15,
            hits: {
              events: [
                {
                  _index: 'index',
                  _id: '1',
                  _source: {
                    '@timestamp': '2020-10-04T15:16:54.368707900Z',
                  },
                },
                {
                  _index: 'index',
                  _id: '2',
                  _source: {
                    '@timestamp': '2020-10-04T05:50:54.368707900Z',
                  },
                },
                {
                  _index: 'index',
                  _id: '3',
                  _source: {
                    '@timestamp': '2020-10-04T18:06:54.368707900Z',
                  },
                },
                {
                  _index: 'index',
                  _id: '4',
                  _source: {
                    '@timestamp': '2020-10-04T23:15:54.368707900Z',
                  },
                },
              ],
              total: {
                value: 4,
                relation: '',
              },
            },
          },
        },
      };

      const aggs = getEqlAggsData(
        response,
        'd',
        '2020-10-04T23:50:00.368707900Z',
        jest.fn() as inputsModel.Refetch
      );
      const date1 = moment(aggs.data[0].x);
      const date2 = moment(aggs.data[1].x);
      // This'll be in ms
      const diff = date1.diff(date2);

      expect(diff).toEqual(3600000);
      expect(aggs.data).toHaveLength(25);
      expect(aggs.data).toEqual([
        { g: 'hits', x: 1601855400368, y: 0 },
        { g: 'hits', x: 1601851800368, y: 1 },
        { g: 'hits', x: 1601848200368, y: 0 },
        { g: 'hits', x: 1601844600368, y: 0 },
        { g: 'hits', x: 1601841000368, y: 0 },
        { g: 'hits', x: 1601837400368, y: 0 },
        { g: 'hits', x: 1601833800368, y: 1 },
        { g: 'hits', x: 1601830200368, y: 0 },
        { g: 'hits', x: 1601826600368, y: 0 },
        { g: 'hits', x: 1601823000368, y: 1 },
        { g: 'hits', x: 1601819400368, y: 0 },
        { g: 'hits', x: 1601815800368, y: 0 },
        { g: 'hits', x: 1601812200368, y: 0 },
        { g: 'hits', x: 1601808600368, y: 0 },
        { g: 'hits', x: 1601805000368, y: 0 },
        { g: 'hits', x: 1601801400368, y: 0 },
        { g: 'hits', x: 1601797800368, y: 0 },
        { g: 'hits', x: 1601794200368, y: 0 },
        { g: 'hits', x: 1601790600368, y: 1 },
        { g: 'hits', x: 1601787000368, y: 0 },
        { g: 'hits', x: 1601783400368, y: 0 },
        { g: 'hits', x: 1601779800368, y: 0 },
        { g: 'hits', x: 1601776200368, y: 0 },
        { g: 'hits', x: 1601772600368, y: 0 },
        { g: 'hits', x: 1601769000368, y: 0 },
      ]);
    });

    test('it correctly returns total hits', () => {
      const mockResponse = getMockResponse();

      const aggs = getEqlAggsData(
        mockResponse,
        'h',
        '2020-10-04T16:00:00.368707900Z',
        jest.fn() as inputsModel.Refetch
      );

      expect(aggs.totalCount).toEqual(4);
    });

    test('it returns array with each item having a "total" of 0 if response returns no hits', () => {
      const mockResponse = getMockResponse();
      const response = {
        ...mockResponse,
        rawResponse: {
          ...mockResponse.rawResponse,
          body: {
            id: 'some-id',
            is_partial: false,
            is_running: false,
            timed_out: false,
            took: 15,
            hits: {
              total: {
                value: 0,
                relation: '',
              },
            },
          },
        },
      };

      const aggs = getEqlAggsData(
        response,
        'h',
        '2020-10-04T16:00:00.368707900Z',
        jest.fn() as inputsModel.Refetch
      );

      expect(aggs.data.every(({ y }) => y === 0)).toBeTruthy();
      expect(aggs.totalCount).toEqual(0);
    });
  });

  describe('createIntervalArray', () => {
    test('returns array of 12 numbers from 0 to 60 by 5', () => {
      const arrayOfNumbers = createIntervalArray(0, 12, 5);
      expect(arrayOfNumbers).toEqual([0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60]);
    });

    test('returns array of 30 numbers from 0 to 60 by 2', () => {
      const arrayOfNumbers = createIntervalArray(0, 30, 2);
      expect(arrayOfNumbers).toEqual([
        0,
        2,
        4,
        6,
        8,
        10,
        12,
        14,
        16,
        18,
        20,
        22,
        24,
        26,
        28,
        30,
        32,
        34,
        36,
        38,
        40,
        42,
        44,
        46,
        48,
        50,
        52,
        54,
        56,
        58,
        60,
      ]);
    });

    test('returns array of numbers from start param to end param if multiplier is 1', () => {
      const arrayOfNumbers = createIntervalArray(0, 12, 1);
      expect(arrayOfNumbers).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    });
  });

  describe('getInterval', () => {
    test('returns object with 2 minute interval keys if range is "h"', () => {
      const intervals = getInterval('h', Date.parse('2020-10-04T15:00:00.368707900Z'));
      const keys = Object.keys(intervals);
      const date1 = moment(Number(intervals['0'].timestamp));
      const date2 = moment(Number(intervals['2'].timestamp));

      // This'll be in ms
      const diff = date1.diff(date2);

      expect(diff).toEqual(120000);
      expect(keys).toEqual([
        '0',
        '2',
        '4',
        '6',
        '8',
        '10',
        '12',
        '14',
        '16',
        '18',
        '20',
        '22',
        '24',
        '26',
        '28',
        '30',
        '32',
        '34',
        '36',
        '38',
        '40',
        '42',
        '44',
        '46',
        '48',
        '50',
        '52',
        '54',
        '56',
        '58',
        '60',
      ]);
    });

    test('returns object with 2 minute interval timestamps if range is "h"', () => {
      const intervals = getInterval('h', 1601856270140);
      const date1 = moment(Number(intervals['0'].timestamp));
      const date2 = moment(Number(intervals['2'].timestamp));

      // This'll be in ms
      const diff = date1.diff(date2);

      expect(diff).toEqual(120000);
    });

    test('returns object with 1 hour interval keys if range is "d"', () => {
      const intervals = getInterval('d', 1601856270140);
      const keys = Object.keys(intervals);
      expect(keys).toEqual([
        '0',
        '1',
        '2',
        '3',
        '4',
        '5',
        '6',
        '7',
        '8',
        '9',
        '10',
        '11',
        '12',
        '13',
        '14',
        '15',
        '16',
        '17',
        '18',
        '19',
        '20',
        '21',
        '22',
        '23',
        '24',
      ]);
    });

    test('returns object with 1 hour interval timestamps if range is "d"', () => {
      const intervals = getInterval('d', 1601856270140);
      const date1 = moment(Number(intervals['0'].timestamp));
      const date2 = moment(Number(intervals['1'].timestamp));

      // This'll be in ms
      const diff = date1.diff(date2);

      expect(diff).toEqual(3600000);
    });

    test('returns error if range is anything other than "h" or "d"', () => {
      expect(() => getInterval('m', 1601856270140)).toThrow();
    });
  });

  describe('getSequenceAggs', () => {
    test('it aggregates events by sequences', () => {
      const mockResponse = getMockSequenceResponse();
      const sequenceAggs = getSequenceAggs(mockResponse, jest.fn() as inputsModel.Refetch);

      expect(sequenceAggs.data).toEqual([
        { g: 'Seq. 1', x: '2020-10-04T15:16:54.368707900Z', y: 1 },
        { g: 'Seq. 1', x: '2020-10-04T15:50:54.368707900Z', y: 1 },
        { g: 'Seq. 2', x: '2020-10-04T15:06:54.368707900Z', y: 1 },
        { g: 'Seq. 2', x: '2020-10-04T15:15:54.368707900Z', y: 1 },
      ]);
    });
  });
});
