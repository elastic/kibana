/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import dateMath from '@elastic/datemath';

import { calculateBucketForHour, calculateBucketForDay, getEqlAggsData } from './helpers';

describe('eql/helpers', () => {
  describe('calculateBucketForHour', () => {
    test('returns 5 if event occured within 5 minutes of "now"', () => {
      const diff = calculateBucketForHour(dateMath.parse('now-4m'), dateMath.parse('now'));

      expect(diff).toEqual(5);
    });

    test('returns 10 if event occured within 5-10 minutes of "now"', () => {
      const diff = calculateBucketForHour(dateMath.parse('now-6m'), dateMath.parse('now'));

      expect(diff).toEqual(10);
    });

    test('returns 15 if event occured within 10-15 minutes of "now"', () => {
      const diff = calculateBucketForHour(dateMath.parse('now-12m'), dateMath.parse('now'));

      expect(diff).toEqual(15);
    });

    test('returns 20 if event occured within 15-20 minutes of "now"', () => {
      const diff = calculateBucketForHour(dateMath.parse('now-16m'), dateMath.parse('now'));

      expect(diff).toEqual(20);
    });

    test('returns 25 if event occured within 20-25 minutes of "now"', () => {
      const diff = calculateBucketForHour(dateMath.parse('now-22m'), dateMath.parse('now'));

      expect(diff).toEqual(25);
    });

    test('returns exact time difference if it is a multiple of 5', () => {
      const diff = calculateBucketForHour(dateMath.parse('now-5m'), dateMath.parse('now'));

      expect(diff).toEqual(5);
    });

    test('returns 0 if times are equal', () => {
      const diff = calculateBucketForHour(dateMath.parse('now'), dateMath.parse('now'));

      expect(diff).toEqual(0);
    });
  });

  describe('calculateBucketForDay', () => {
    test('returns 0 if two dates are equivalent', () => {
      const diff = calculateBucketForDay(dateMath.parse('now'), dateMath.parse('now'));

      expect(diff).toEqual(0);
    });

    test('returns 1 if event occured within 60 minutes of "now"', () => {
      const diff = calculateBucketForDay(dateMath.parse('now-40m'), dateMath.parse('now'));

      expect(diff).toEqual(1);
    });

    test('returns 2 if event occured 60-120 minutes from "now"', () => {
      const diff = calculateBucketForDay(dateMath.parse('now-120m'), dateMath.parse('now'));

      expect(diff).toEqual(2);
    });

    test('returns 3 if event occured 120-180 minutes from "now', () => {
      const diff = calculateBucketForDay(dateMath.parse('now-121m'), dateMath.parse('now'));

      expect(diff).toEqual(3);
    });

    test('returns 4 if event occured 180-240 minutes from "now', () => {
      const diff = calculateBucketForDay(dateMath.parse('now-220m'), dateMath.parse('now'));

      expect(diff).toEqual(4);
    });
  });

  describe('getEqlAggsData', () => {
    test('it returns results bucketed into 5 min intervals when range is "h"', () => {
      const mockResponse = {
        id: 'FmFXMzdOZklmVDYyODJ6LVNDaVBndmcfbTg4clY0SElTN3VFYkgyWlRlNEcxZzoxNzgwMzkzNQ==',
        isPartial: false,
        isRunning: false,
        rawResponse: {
          body: {
            id: 'FmFXMzdOZklmVDYyODJ6LVNDaVBndmcfbTg4clY0SElTN3VFYkgyWlRlNEcxZzoxNzgwMzkzNQ==',
            is_partial: false,
            is_running: false,
            timed_out: false,
            took: 15,
            hits: {
              events: [
                {
                  _source: {
                    '@timestamp': '2020-10-04T15:16:54.368707900Z',
                  },
                },
                {
                  _source: {
                    '@timestamp': '2020-10-04T15:50:54.368707900Z',
                  },
                },
                {
                  _source: {
                    '@timestamp': '2020-10-04T15:06:54.368707900Z',
                  },
                },
                {
                  _source: {
                    '@timestamp': '2020-10-04T15:15:54.368707900Z',
                  },
                },
              ],
              total: {
                value: 4,
              },
            },
          },
          total: { value: 10, relation: 'eq' },
          headers: {},
          hits: {},
          meta: {
            request: {
              params: {
                method: 'GET',
                path: '/_eql/search/',
                querystring: 'wait_for_completion_timeout=100ms&keep_alive=1m',
                timeout: 30000,
              },
            },
          },
          statusCode: 200,
        },
      };

      const aggs = getEqlAggsData(
        mockResponse,
        'h',
        '2020-10-04T15:00:00.368707900Z',
        '2020-10-04T16:00:00.368707900Z'
      );

      expect(aggs.data).toHaveLength(12);
      expect(aggs.data).toEqual([
        { g: 'hits', x: 1601826900368, y: 0 },
        { g: 'hits', x: 1601826600368, y: 1 },
        { g: 'hits', x: 1601826300368, y: 0 },
        { g: 'hits', x: 1601826000368, y: 0 },
        { g: 'hits', x: 1601825700368, y: 0 },
        { g: 'hits', x: 1601825400368, y: 0 },
        { g: 'hits', x: 1601825100368, y: 0 },
        { g: 'hits', x: 1601824800368, y: 0 },
        { g: 'hits', x: 1601824500368, y: 2 },
        { g: 'hits', x: 1601824200368, y: 0 },
        { g: 'hits', x: 1601823900368, y: 1 },
        { g: 'hits', x: 1601823600368, y: 0 },
      ]);
    });

    test('it returns results bucketed into 1 hour intervals when range is "d"', () => {
      const mockResponse = {
        id: 'FmFXMzdOZklmVDYyODJ6LVNDaVBndmcfbTg4clY0SElTN3VFYkgyWlRlNEcxZzoxNzgwMzkzNQ==',
        isPartial: false,
        isRunning: false,
        rawResponse: {
          body: {
            id: 'FmFXMzdOZklmVDYyODJ6LVNDaVBndmcfbTg4clY0SElTN3VFYkgyWlRlNEcxZzoxNzgwMzkzNQ==',
            is_partial: false,
            is_running: false,
            timed_out: false,
            took: 15,
            hits: {
              events: [
                {
                  _source: {
                    '@timestamp': '2020-10-04T15:16:54.368707900Z',
                  },
                },
                {
                  _source: {
                    '@timestamp': '2020-10-04T05:50:54.368707900Z',
                  },
                },
                {
                  _source: {
                    '@timestamp': '2020-10-04T18:06:54.368707900Z',
                  },
                },
                {
                  _source: {
                    '@timestamp': '2020-10-04T23:15:54.368707900Z',
                  },
                },
              ],
              total: {
                value: 4,
              },
            },
          },
          total: { value: 10, relation: 'eq' },
          headers: {},
          hits: {},
          meta: {
            request: {
              params: {
                method: 'GET',
                path: '/_eql/search/',
                querystring: 'wait_for_completion_timeout=100ms&keep_alive=1m',
                timeout: 30000,
              },
            },
          },
          statusCode: 200,
        },
      };

      const aggs = getEqlAggsData(
        mockResponse,
        'd',
        '2020-10-03T23:50:00.368707900Z',
        '2020-10-04T23:50:00.368707900Z'
      );

      expect(aggs.data).toHaveLength(24);
      expect(aggs.data).toEqual([
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
      const mockResponse = {
        id: 'FmFXMzdOZklmVDYyODJ6LVNDaVBndmcfbTg4clY0SElTN3VFYkgyWlRlNEcxZzoxNzgwMzkzNQ==',
        isPartial: false,
        isRunning: false,
        rawResponse: {
          body: {
            id: 'FmFXMzdOZklmVDYyODJ6LVNDaVBndmcfbTg4clY0SElTN3VFYkgyWlRlNEcxZzoxNzgwMzkzNQ==',
            is_partial: false,
            is_running: false,
            timed_out: false,
            took: 15,
            hits: {
              events: [
                {
                  _source: {
                    '@timestamp': '2020-10-04T15:16:54.368707900Z',
                  },
                },
                {
                  _source: {
                    '@timestamp': '2020-10-04T15:50:54.368707900Z',
                  },
                },
                {
                  _source: {
                    '@timestamp': '2020-10-04T15:06:54.368707900Z',
                  },
                },
                {
                  _source: {
                    '@timestamp': '2020-10-04T15:15:54.368707900Z',
                  },
                },
              ],
              total: {
                value: 4,
              },
            },
          },
          total: { value: 10, relation: 'eq' },
          headers: {},
          hits: {},
          meta: {
            request: {
              params: {
                method: 'GET',
                path: '/_eql/search/',
                querystring: 'wait_for_completion_timeout=100ms&keep_alive=1m',
                timeout: 30000,
              },
            },
          },
          statusCode: 200,
        },
      };

      const aggs = getEqlAggsData(
        mockResponse,
        'h',
        '2020-10-04T15:00:00.368707900Z',
        '2020-10-04T16:00:00.368707900Z'
      );

      expect(aggs.totalCount).toEqual(4);
    });

    test('it returns empty array for "data" if response returns no hits', () => {
      const mockResponse = {
        id: 'FmFXMzdOZklmVDYyODJ6LVNDaVBndmcfbTg4clY0SElTN3VFYkgyWlRlNEcxZzoxNzgwMzkzNQ==',
        isPartial: false,
        isRunning: false,
        rawResponse: {
          body: {
            id: 'FmFXMzdOZklmVDYyODJ6LVNDaVBndmcfbTg4clY0SElTN3VFYkgyWlRlNEcxZzoxNzgwMzkzNQ==',
            is_partial: false,
            is_running: false,
            timed_out: false,
            took: 15,
            hits: {},
          },
          total: { value: 10, relation: 'eq' },
          headers: {},
          hits: {},
          meta: {
            request: {
              params: {
                method: 'GET',
                path: '/_eql/search/',
                querystring: 'wait_for_completion_timeout=100ms&keep_alive=1m',
                timeout: 30000,
              },
            },
          },
          statusCode: 200,
        },
      };

      const aggs = getEqlAggsData(
        mockResponse,
        'h',
        '2020-10-04T15:00:00.368707900Z',
        '2020-10-04T16:00:00.368707900Z'
      );

      expect(aggs).toEqual({
        data: [],
        gte: '2020-10-04T15:00:00.368707900Z',
        inspect: {
          dsl: [JSON.stringify(mockResponse.rawResponse.meta.request.params, null, 2)],
          response: [JSON.stringify(mockResponse.rawResponse.body, null, 2)],
        },
        lte: '2020-10-04T16:00:00.368707900Z',
        totalCount: 0,
      });
    });
  });
});
