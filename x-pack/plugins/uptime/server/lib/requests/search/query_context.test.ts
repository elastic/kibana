/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryContext } from './query_context';
import { CursorPagination } from './types';
import { CursorDirection, SortOrder } from '../../../../common/runtime_types';
import { getUptimeESMockClient } from '../helper';

describe(QueryContext, () => {
  // 10 minute range
  const rangeStart = '2019-02-03T19:06:54.939Z';
  const rangeEnd = '2019-02-03T19:16:54.939Z';

  const pagination: CursorPagination = {
    cursorDirection: CursorDirection.AFTER,
    sortOrder: SortOrder.DESC,
  };

  let qc: QueryContext;
  beforeEach(
    () =>
      (qc = new QueryContext(
        getUptimeESMockClient().uptimeEsClient,
        rangeStart,
        rangeEnd,
        pagination,
        null,
        10
      ))
  );

  describe('dateRangeFilter()', () => {
    const expectedRange = {
      range: {
        '@timestamp': {
          gte: rangeStart,
          lte: rangeEnd,
        },
      },
    };
    describe('when hasTimespan() is true', () => {
      it('should create a date range filter including the timespan', async () => {
        const mockHasTimespan = jest.fn();
        mockHasTimespan.mockReturnValue(true);
        qc.hasTimespan = mockHasTimespan;

        expect(await qc.dateRangeFilter()).toEqual({
          bool: {
            filter: [
              expectedRange,
              {
                bool: {
                  should: [
                    qc.timespanClause(),
                    { bool: { must_not: { exists: { field: 'monitor.timespan' } } } },
                  ],
                },
              },
            ],
          },
        });
      });
    });

    describe('when hasTimespan() is false', () => {
      it('should only use the timestamp fields in the returned filter', async () => {
        const mockHasTimespan = jest.fn();
        mockHasTimespan.mockReturnValue(false);
        qc.hasTimespan = mockHasTimespan;

        expect(await qc.dateRangeFilter()).toEqual(expectedRange);
      });
    });
  });

  describe('timespanClause()', () => {
    it('should always cover the last 5m', () => {
      // 5m expected range between GTE and LTE in the response
      // since timespan is hardcoded to 5m
      expect(qc.timespanClause()).toEqual({
        range: {
          'monitor.timespan': {
            // end date minus 5m
            gte: new Date(Date.parse(rangeEnd) - 5 * 60 * 1000).toISOString(),
            lte: rangeEnd,
          },
        },
      });
    });
  });
});
