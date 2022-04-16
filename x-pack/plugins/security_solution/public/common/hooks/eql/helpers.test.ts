/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

import type { EqlSearchStrategyResponse } from '@kbn/data-plugin/common';
import { Source } from './types';
import { EqlSearchResponse } from '../../../../common/detection_engine/types';
import { inputsModel } from '../../store';

import {
  calculateBucketForHour,
  calculateBucketForDay,
  getEqlAggsData,
  createIntervalArray,
  getInterval,
  formatInspect,
  getEventsToBucket,
} from './helpers';
import {
  getMockEndgameEqlResponse,
  getMockEqlResponse,
  getMockEqlSequenceResponse,
} from './eql_search_response.mock';

describe('eql/helpers', () => {
  describe('calculateBucketForHour', () => {
    test('returns 2 if the difference in times is 2 minutes', () => {
      const diff = calculateBucketForHour(
        Date.parse('2020-02-20T05:56:54.037Z'),
        Date.parse('2020-02-20T05:57:54.037Z')
      );

      expect(diff).toEqual(2);
    });

    test('returns 10 if the difference in times is 8-10 minutes', () => {
      const diff = calculateBucketForHour(
        Date.parse('2020-02-20T05:48:54.037Z'),
        Date.parse('2020-02-20T05:57:54.037Z')
      );

      expect(diff).toEqual(10);
    });

    test('returns 16 if the difference in times is 10-15 minutes', () => {
      const diff = calculateBucketForHour(
        Date.parse('2020-02-20T05:42:54.037Z'),
        Date.parse('2020-02-20T05:57:54.037Z')
      );

      expect(diff).toEqual(16);
    });

    test('returns 60 if the difference in times is 58-60 minutes', () => {
      const diff = calculateBucketForHour(
        Date.parse('2020-02-20T04:58:54.037Z'),
        Date.parse('2020-02-20T05:57:54.037Z')
      );

      expect(diff).toEqual(60);
    });

    test('returns exact time difference if it is a multiple of 2', () => {
      const diff = calculateBucketForHour(
        Date.parse('2020-02-20T05:37:54.037Z'),
        Date.parse('2020-02-20T05:57:54.037Z')
      );

      expect(diff).toEqual(20);
    });

    test('returns 0 if times are equal', () => {
      const diff = calculateBucketForHour(
        Date.parse('2020-02-20T05:57:54.037Z'),
        Date.parse('2020-02-20T05:57:54.037Z')
      );

      expect(diff).toEqual(0);
    });

    test('returns 2 if the difference in times is 2 minutes but arguments are flipped', () => {
      const diff = calculateBucketForHour(
        Date.parse('2020-02-20T05:57:54.037Z'),
        Date.parse('2020-02-20T05:56:54.037Z')
      );

      expect(diff).toEqual(2);
    });
  });

  describe('calculateBucketForDay', () => {
    test('returns 0 if two dates are equivalent', () => {
      const diff = calculateBucketForDay(
        Date.parse('2020-02-20T05:57:54.037Z'),
        Date.parse('2020-02-20T05:57:54.037Z')
      );

      expect(diff).toEqual(0);
    });

    test('returns 1 if the difference in times is 60 minutes', () => {
      const diff = calculateBucketForDay(
        Date.parse('2020-02-20T05:17:54.037Z'),
        Date.parse('2020-02-20T05:57:54.037Z')
      );

      expect(diff).toEqual(1);
    });

    test('returns 2 if the difference in times is 60-120 minutes', () => {
      const diff = calculateBucketForDay(
        Date.parse('2020-02-20T03:57:54.037Z'),
        Date.parse('2020-02-20T05:57:54.037Z')
      );

      expect(diff).toEqual(2);
    });

    test('returns 3 if the difference in times is 120-180 minutes', () => {
      const diff = calculateBucketForDay(
        Date.parse('2020-02-20T03:56:54.037Z'),
        Date.parse('2020-02-20T05:57:54.037Z')
      );

      expect(diff).toEqual(3);
    });

    test('returns 4 if the difference in times is 180-240 minutes', () => {
      const diff = calculateBucketForDay(
        Date.parse('2020-02-20T02:15:54.037Z'),
        Date.parse('2020-02-20T05:57:54.037Z')
      );

      expect(diff).toEqual(4);
    });

    test('returns 2 if the difference in times is 60-120 minutes but arguments are flipped', () => {
      const diff = calculateBucketForDay(
        Date.parse('2020-02-20T05:57:54.037Z'),
        Date.parse('2020-02-20T03:59:54.037Z')
      );

      expect(diff).toEqual(2);
    });
  });

  describe('getEqlAggsData', () => {
    describe('non-sequence', () => {
      // NOTE: We previously expected @timestamp to be a string, however,
      // date can also be a number (like for endgame-*)
      test('it works when @timestamp is a number', () => {
        const mockResponse = getMockEndgameEqlResponse();

        const aggs = getEqlAggsData(
          mockResponse,
          'h',
          '2020-10-04T16:00:00.368707900Z',
          jest.fn() as inputsModel.Refetch,
          ['foo-*'],
          false
        );

        const date1 = moment(aggs.data[0].x);
        const date2 = moment(aggs.data[1].x);
        // This will be in ms
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

      test('it returns results bucketed into 2 min intervals when range is "h"', () => {
        const mockResponse = getMockEqlResponse();

        const aggs = getEqlAggsData(
          mockResponse,
          'h',
          '2020-10-04T16:00:00.368707900Z',
          jest.fn() as inputsModel.Refetch,
          ['foo-*'],
          false
        );

        const date1 = moment(aggs.data[0].x);
        const date2 = moment(aggs.data[1].x);
        // This will be in ms
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
        const mockResponse = getMockEqlResponse();
        const response: EqlSearchStrategyResponse<EqlSearchResponse<Source>> = {
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
          jest.fn() as inputsModel.Refetch,
          ['foo-*'],
          false
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
        const mockResponse = getMockEqlResponse();

        const aggs = getEqlAggsData(
          mockResponse,
          'h',
          '2020-10-04T16:00:00.368707900Z',
          jest.fn() as inputsModel.Refetch,
          ['foo-*'],
          false
        );

        expect(aggs.totalCount).toEqual(4);
      });

      test('it returns array with each item having a "total" of 0 if response returns no hits', () => {
        const mockResponse = getMockEqlResponse();
        const response: EqlSearchStrategyResponse<EqlSearchResponse<Source>> = {
          ...mockResponse,
          rawResponse: {
            ...mockResponse.rawResponse,
            body: {
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
          jest.fn() as inputsModel.Refetch,
          ['foo-*'],
          false
        );

        expect(aggs.data.every(({ y }) => y === 0)).toBeTruthy();
        expect(aggs.totalCount).toEqual(0);
      });
    });

    describe('sequence', () => {
      test('it returns results bucketed into 2 min intervals when range is "h"', () => {
        const mockResponse = getMockEqlSequenceResponse();

        const aggs = getEqlAggsData(
          mockResponse,
          'h',
          '2020-10-04T16:00:00.368707900Z',
          jest.fn() as inputsModel.Refetch,
          ['foo-*'],
          true
        );

        const date1 = moment(aggs.data[0].x);
        const date2 = moment(aggs.data[1].x);
        // This will be in ms
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
          { g: 'hits', x: 1601824560368, y: 1 },
          { g: 'hits', x: 1601824440368, y: 0 },
          { g: 'hits', x: 1601824320368, y: 0 },
          { g: 'hits', x: 1601824200368, y: 0 },
          { g: 'hits', x: 1601824080368, y: 0 },
          { g: 'hits', x: 1601823960368, y: 0 },
          { g: 'hits', x: 1601823840368, y: 0 },
          { g: 'hits', x: 1601823720368, y: 0 },
          { g: 'hits', x: 1601823600368, y: 0 },
        ]);
      });

      test('it returns results bucketed into 1 hour intervals when range is "d"', () => {
        const mockResponse = getMockEqlSequenceResponse();
        const response: EqlSearchStrategyResponse<EqlSearchResponse<Source>> = {
          ...mockResponse,
          rawResponse: {
            ...mockResponse.rawResponse,
            body: {
              is_partial: false,
              is_running: false,
              timed_out: false,
              took: 15,
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
                          '@timestamp': '2020-10-04T05:50:54.368707900Z',
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
          jest.fn() as inputsModel.Refetch,
          ['foo-*'],
          true
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
          { g: 'hits', x: 1601833800368, y: 0 },
          { g: 'hits', x: 1601830200368, y: 0 },
          { g: 'hits', x: 1601826600368, y: 0 },
          { g: 'hits', x: 1601823000368, y: 0 },
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
        const mockResponse = getMockEqlSequenceResponse();

        const aggs = getEqlAggsData(
          mockResponse,
          'h',
          '2020-10-04T16:00:00.368707900Z',
          jest.fn() as inputsModel.Refetch,
          ['foo-*'],
          true
        );

        expect(aggs.totalCount).toEqual(4);
      });

      test('it returns array with each item having a "total" of 0 if response returns no hits', () => {
        const mockResponse = getMockEqlSequenceResponse();
        const response: EqlSearchStrategyResponse<EqlSearchResponse<Source>> = {
          ...mockResponse,
          rawResponse: {
            ...mockResponse.rawResponse,
            body: {
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
          jest.fn() as inputsModel.Refetch,
          ['foo-*'],
          true
        );

        expect(aggs.data.every(({ y }) => y === 0)).toBeTruthy();
        expect(aggs.totalCount).toEqual(0);
      });
    });
  });

  describe('createIntervalArray', () => {
    test('returns array of 12 numbers from 0 to 60 by 5', () => {
      const arrayOfNumbers = createIntervalArray(0, 12, 5);
      expect(arrayOfNumbers).toEqual([0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60]);
    });

    test('returns array of 5 numbers from 0 to 10 by 2', () => {
      const arrayOfNumbers = createIntervalArray(0, 5, 2);
      expect(arrayOfNumbers).toEqual([0, 2, 4, 6, 8, 10]);
    });

    test('returns array of numbers from start param to end param if multiplier is 1', () => {
      const arrayOfNumbers = createIntervalArray(0, 12, 1);
      expect(arrayOfNumbers).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    });
  });

  describe('getInterval', () => {
    test('returns object with 2 minute interval timestamps if range is "h"', () => {
      const intervals = getInterval('h', 1601856270140);

      const allAre2MinApart = Object.keys(intervals).every((int) => {
        const interval1 = intervals[int];
        const interval2 = intervals[`${Number(int) + 2}`];
        if (interval1 != null && interval2 != null) {
          const date1 = moment(Number(interval1.timestamp));
          const date2 = moment(Number(interval2.timestamp));
          // This'll be in ms
          const diff = date1.diff(date2);

          return diff === 120000;
        }

        return true;
      });

      expect(allAre2MinApart).toBeTruthy();
    });

    test('returns object with 1 hour interval timestamps if range is "d"', () => {
      const intervals = getInterval('d', 1601856270140);

      const allAre1HourApart = Object.keys(intervals).every((int) => {
        const interval1 = intervals[int];
        const interval2 = intervals[`${Number(int) + 1}`];
        if (interval1 != null && interval2 != null) {
          const date1 = moment(Number(interval1.timestamp));
          const date2 = moment(Number(interval2.timestamp));
          // This'll be in ms
          const diff = date1.diff(date2);

          return diff === 3600000;
        }

        return true;
      });

      expect(allAre1HourApart).toBeTruthy();
    });

    test('returns error if range is anything other than "h" or "d"', () => {
      expect(() => getInterval('m', 1601856270140)).toThrow();
    });
  });

  describe('formatInspect', () => {
    test('it should return "dsl" with response params and index info', () => {
      const { dsl } = formatInspect(getMockEqlResponse(), ['foo-*']);

      expect(JSON.parse(dsl[0])).toEqual({
        body: {
          filter: {
            range: {
              '@timestamp': {
                format: 'strict_date_optional_time',
                gte: '2020-10-07T00:46:12.414Z',
                lte: '2020-10-07T01:46:12.414Z',
              },
            },
          },
        },
        index: ['foo-*'],
        method: 'GET',
        path: '/_eql/search/',
        querystring: 'some query string',
      });
    });

    test('it should return "response"', () => {
      const mockResponse = getMockEqlResponse();
      const { response } = formatInspect(mockResponse, ['foo-*']);

      expect(JSON.parse(response[0])).toEqual(mockResponse.rawResponse.body);
    });
  });

  describe('getEventsToBucket', () => {
    test('returns events for non-sequence queries', () => {
      const events = getEventsToBucket(false, getMockEqlResponse());

      expect(events).toEqual([
        { _id: '1', _index: 'index', _source: { '@timestamp': '2020-10-04T15:16:54.368707900Z' } },
        { _id: '2', _index: 'index', _source: { '@timestamp': '2020-10-04T15:50:54.368707900Z' } },
        { _id: '3', _index: 'index', _source: { '@timestamp': '2020-10-04T15:06:54.368707900Z' } },
        { _id: '4', _index: 'index', _source: { '@timestamp': '2020-10-04T15:15:54.368707900Z' } },
      ]);
    });

    test('returns empty array if no hits', () => {
      const resp = getMockEqlResponse();
      const mockResponse: EqlSearchStrategyResponse<EqlSearchResponse<Source>> = {
        ...resp,
        rawResponse: {
          ...resp.rawResponse,
          body: {
            ...resp.rawResponse.body,
            hits: {
              total: {
                value: 0,
                relation: '',
              },
            },
          },
        },
      };
      const events = getEventsToBucket(false, mockResponse);

      expect(events).toEqual([]);
    });

    test('returns events for sequence queries', () => {
      const events = getEventsToBucket(true, getMockEqlSequenceResponse());

      expect(events).toEqual([
        { _id: '2', _index: 'index', _source: { '@timestamp': '2020-10-04T15:50:54.368707900Z' } },
        { _id: '4', _index: 'index', _source: { '@timestamp': '2020-10-04T15:15:54.368707900Z' } },
      ]);
    });

    test('returns empty array if no sequences', () => {
      const resp = getMockEqlSequenceResponse();
      const mockResponse: EqlSearchStrategyResponse<EqlSearchResponse<Source>> = {
        ...resp,
        rawResponse: {
          ...resp.rawResponse,
          body: {
            ...resp.rawResponse.body,
            hits: {
              total: {
                value: 0,
                relation: '',
              },
            },
          },
        },
      };
      const events = getEventsToBucket(true, mockResponse);

      expect(events).toEqual([]);
    });
  });
});
