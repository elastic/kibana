/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OnlyEsqlQueryRuleParams } from '../types';
import { Comparator } from '../../../../common/comparator_types';
import { getEsqlQuery } from './fetch_esql_query';

const getTimeRange = () => {
  const date = Date.now();
  const dateStart = new Date(date - 300000).toISOString();
  const dateEnd = new Date(date).toISOString();

  return { dateStart, dateEnd };
};

const defaultParams: OnlyEsqlQueryRuleParams = {
  size: 100,
  timeWindowSize: 5,
  timeWindowUnit: 'm',
  thresholdComparator: Comparator.GT,
  threshold: [0],
  esqlQuery: { esql: 'from test' },
  excludeHitsFromPreviousRun: false,
  searchType: 'esqlQuery',
  aggType: 'count',
  groupBy: 'all',
  timeField: 'time',
};

describe('fetchEsqlQuery', () => {
  describe('getEsqlQuery', () => {
    afterAll(() => {
      jest.resetAllMocks();
    });

    const fakeNow = new Date('2020-02-09T23:15:41.941Z');

    beforeAll(() => {
      jest.resetAllMocks();
      global.Date.now = jest.fn(() => fakeNow.getTime());
    });

    it('should generate the correct query', async () => {
      const params = defaultParams;
      const { dateStart, dateEnd } = getTimeRange();
      const query = getEsqlQuery(params, undefined, dateStart, dateEnd);

      expect(query).toMatchInlineSnapshot(`
        Object {
          "filter": Object {
            "bool": Object {
              "filter": Array [
                Object {
                  "range": Object {
                    "time": Object {
                      "format": "strict_date_optional_time",
                      "gt": "2020-02-09T23:10:41.941Z",
                      "lte": "2020-02-09T23:15:41.941Z",
                    },
                  },
                },
              ],
            },
          },
          "query": "from test",
        }
      `);
    });

    it('should generate the correct query with the alertLimit', async () => {
      const params = defaultParams;
      const { dateStart, dateEnd } = getTimeRange();
      const query = getEsqlQuery(params, 100, dateStart, dateEnd);

      expect(query).toMatchInlineSnapshot(`
        Object {
          "filter": Object {
            "bool": Object {
              "filter": Array [
                Object {
                  "range": Object {
                    "time": Object {
                      "format": "strict_date_optional_time",
                      "gt": "2020-02-09T23:10:41.941Z",
                      "lte": "2020-02-09T23:15:41.941Z",
                    },
                  },
                },
              ],
            },
          },
          "query": "from test | limit 100",
        }
      `);
    });
  });
});
