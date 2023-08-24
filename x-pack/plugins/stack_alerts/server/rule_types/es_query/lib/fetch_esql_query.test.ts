/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OnlyEsqlQueryRuleParams } from '../types';
import { stubbedSavedObjectIndexPattern } from '@kbn/data-views-plugin/common/data_view.stub';
import { DataView } from '@kbn/data-views-plugin/common';
import { fieldFormatsMock } from '@kbn/field-formats-plugin/common/mocks';
import { Comparator } from '../../../../common/comparator_types';
import { getEsqlQuery } from './fetch_esql_query';

const createDataView = () => {
  const id = 'test-id';
  const {
    type,
    version,
    attributes: { timeFieldName, fields, title },
  } = stubbedSavedObjectIndexPattern(id);

  return new DataView({
    spec: { id, type, version, timeFieldName, fields: JSON.parse(fields), title },
    fieldFormats: fieldFormatsMock,
    shortDotsEnable: false,
    metaFields: ['_id', '_type', '_score'],
  });
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
    const dataViewMock = createDataView();
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
      const { query, dateStart, dateEnd } = getEsqlQuery(dataViewMock, params, undefined);

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
      expect(dateStart).toMatch('2020-02-09T23:10:41.941Z');
      expect(dateEnd).toMatch('2020-02-09T23:15:41.941Z');
    });

    it('should generate the correct query with the alertLimit', async () => {
      const params = defaultParams;
      const { query, dateStart, dateEnd } = getEsqlQuery(dataViewMock, params, 100);

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
      expect(dateStart).toMatch('2020-02-09T23:10:41.941Z');
      expect(dateEnd).toMatch('2020-02-09T23:15:41.941Z');
    });
  });
});
