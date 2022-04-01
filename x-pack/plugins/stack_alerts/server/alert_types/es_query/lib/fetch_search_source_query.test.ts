/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OnlySearchSourceAlertParams } from '../types';
import { createSearchSourceMock } from 'src/plugins/data/common/search/search_source/mocks';
import { updateSearchSource } from './fetch_search_source_query';
import { stubbedSavedObjectIndexPattern } from '../../../../../../../src/plugins/data_views/common/data_view.stub';
import { DataView } from '../../../../../../../src/plugins/data_views/common';
import { fieldFormatsMock } from '../../../../../../../src/plugins/field_formats/common/mocks';
import { Comparator } from '../../../../common/comparator_types';

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

const defaultParams: OnlySearchSourceAlertParams = {
  size: 100,
  timeWindowSize: 5,
  timeWindowUnit: 'm',
  thresholdComparator: Comparator.LT,
  threshold: [0],
  searchConfiguration: {},
  searchType: 'searchSource',
};

describe('fetchSearchSourceQuery', () => {
  describe('updateSearchSource', () => {
    const dataViewMock = createDataView();
    afterAll(() => {
      jest.resetAllMocks();
    });

    const fakeNow = new Date('2020-02-09T23:15:41.941Z');

    beforeAll(() => {
      jest.resetAllMocks();
      global.Date.now = jest.fn(() => fakeNow.getTime());
    });

    it('without latest timestamp', async () => {
      const params = { ...defaultParams, thresholdComparator: Comparator.GT_OR_EQ, threshold: [3] };

      const searchSourceInstance = createSearchSourceMock({ index: dataViewMock });

      const { searchSource, dateStart, dateEnd } = updateSearchSource(
        searchSourceInstance,
        params,
        undefined
      );
      const searchRequest = searchSource.getSearchRequestBody();
      expect(searchRequest.query).toMatchInlineSnapshot(`
        Object {
          "bool": Object {
            "filter": Array [
              Object {
                "range": Object {
                  "time": Object {
                    "format": "strict_date_optional_time",
                    "gte": "2020-02-09T23:10:41.941Z",
                    "lte": "2020-02-09T23:15:41.941Z",
                  },
                },
              },
            ],
            "must": Array [],
            "must_not": Array [],
            "should": Array [],
          },
        }
      `);
      expect(dateStart).toMatch('2020-02-09T23:10:41.941Z');
      expect(dateEnd).toMatch('2020-02-09T23:15:41.941Z');
    });

    it('with latest timestamp in between the given time range ', async () => {
      const params = { ...defaultParams, thresholdComparator: Comparator.GT_OR_EQ, threshold: [3] };

      const searchSourceInstance = createSearchSourceMock({ index: dataViewMock });

      const { searchSource } = updateSearchSource(
        searchSourceInstance,
        params,
        '2020-02-09T23:12:41.941Z'
      );
      const searchRequest = searchSource.getSearchRequestBody();
      expect(searchRequest.query).toMatchInlineSnapshot(`
        Object {
          "bool": Object {
            "filter": Array [
              Object {
                "range": Object {
                  "time": Object {
                    "format": "strict_date_optional_time",
                    "gte": "2020-02-09T23:10:41.941Z",
                    "lte": "2020-02-09T23:15:41.941Z",
                  },
                },
              },
              Object {
                "range": Object {
                  "time": Object {
                    "gt": "2020-02-09T23:12:41.941Z",
                  },
                },
              },
            ],
            "must": Array [],
            "must_not": Array [],
            "should": Array [],
          },
        }
      `);
    });

    it('with latest timestamp in before the given time range ', async () => {
      const params = { ...defaultParams, thresholdComparator: Comparator.GT_OR_EQ, threshold: [3] };

      const searchSourceInstance = createSearchSourceMock({ index: dataViewMock });

      const { searchSource } = updateSearchSource(
        searchSourceInstance,
        params,
        '2020-01-09T22:12:41.941Z'
      );
      const searchRequest = searchSource.getSearchRequestBody();
      expect(searchRequest.query).toMatchInlineSnapshot(`
        Object {
          "bool": Object {
            "filter": Array [
              Object {
                "range": Object {
                  "time": Object {
                    "format": "strict_date_optional_time",
                    "gte": "2020-02-09T23:10:41.941Z",
                    "lte": "2020-02-09T23:15:41.941Z",
                  },
                },
              },
            ],
            "must": Array [],
            "must_not": Array [],
            "should": Array [],
          },
        }
      `);
    });
  });
});
