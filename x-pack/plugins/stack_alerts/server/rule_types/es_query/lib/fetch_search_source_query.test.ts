/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OnlySearchSourceRuleParams } from '../types';
import { createSearchSourceMock } from '@kbn/data-plugin/common/search/search_source/mocks';
import { updateSearchSource, getSmallerDataViewSpec } from './fetch_search_source_query';
import {
  createStubDataView,
  stubbedSavedObjectIndexPattern,
} from '@kbn/data-views-plugin/common/data_view.stub';
import { DataView } from '@kbn/data-views-plugin/common';
import { fieldFormatsMock } from '@kbn/field-formats-plugin/common/mocks';
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

const getTimeRange = () => {
  const date = Date.now();
  const dateStart = new Date(date - 300000).toISOString();
  const dateEnd = new Date(date).toISOString();

  return { dateStart, dateEnd };
};

const defaultParams: OnlySearchSourceRuleParams = {
  size: 100,
  timeWindowSize: 5,
  timeWindowUnit: 'm',
  thresholdComparator: Comparator.LT,
  threshold: [0],
  searchConfiguration: {},
  searchType: 'searchSource',
  excludeHitsFromPreviousRun: true,
  aggType: 'count',
  groupBy: 'all',
  timeField: 'time',
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

      const { dateStart, dateEnd } = getTimeRange();
      const searchSource = updateSearchSource(
        searchSourceInstance,
        dataViewMock,
        params,
        undefined,
        dateStart,
        dateEnd
      );
      const searchRequest = searchSource.getSearchRequestBody();
      expect(searchRequest.size).toMatchInlineSnapshot(`100`);
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
      expect(searchRequest.aggs).toMatchInlineSnapshot(`Object {}`);
    });

    it('with latest timestamp in between the given time range ', async () => {
      const params = { ...defaultParams, thresholdComparator: Comparator.GT_OR_EQ, threshold: [3] };

      const searchSourceInstance = createSearchSourceMock({ index: dataViewMock });

      const { dateStart, dateEnd } = getTimeRange();
      const searchSource = updateSearchSource(
        searchSourceInstance,
        dataViewMock,
        params,
        '2020-02-09T23:12:41.941Z',
        dateStart,
        dateEnd
      );
      const searchRequest = searchSource.getSearchRequestBody();
      expect(searchRequest.size).toMatchInlineSnapshot(`100`);
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
                    "format": "strict_date_optional_time",
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
      expect(searchRequest.aggs).toMatchInlineSnapshot(`Object {}`);
    });

    it('with latest timestamp in before the given time range ', async () => {
      const params = { ...defaultParams, thresholdComparator: Comparator.GT_OR_EQ, threshold: [3] };

      const searchSourceInstance = createSearchSourceMock({ index: dataViewMock });

      const { dateStart, dateEnd } = getTimeRange();
      const searchSource = updateSearchSource(
        searchSourceInstance,
        dataViewMock,
        params,
        '2020-01-09T22:12:41.941Z',
        dateStart,
        dateEnd
      );
      const searchRequest = searchSource.getSearchRequestBody();
      expect(searchRequest.size).toMatchInlineSnapshot(`100`);
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
      expect(searchRequest.aggs).toMatchInlineSnapshot(`Object {}`);
    });

    it('does not add time range if excludeHitsFromPreviousRun is false', async () => {
      const params = { ...defaultParams, excludeHitsFromPreviousRun: false };

      const searchSourceInstance = createSearchSourceMock({ index: dataViewMock });

      const { dateStart, dateEnd } = getTimeRange();
      const searchSource = updateSearchSource(
        searchSourceInstance,
        dataViewMock,
        params,
        '2020-02-09T23:12:41.941Z',
        dateStart,
        dateEnd
      );
      const searchRequest = searchSource.getSearchRequestBody();
      expect(searchRequest.size).toMatchInlineSnapshot(`100`);
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
      expect(searchRequest.aggs).toMatchInlineSnapshot(`Object {}`);
    });

    it('should set size: 0 and top hits size to size parameter if grouping alerts', async () => {
      const params = {
        ...defaultParams,
        excludeHitsFromPreviousRun: false,
        groupBy: 'top',
        termField: 'host.name',
        termSize: 10,
      };

      const searchSourceInstance = createSearchSourceMock({ index: dataViewMock });

      const { dateStart, dateEnd } = getTimeRange();
      const searchSource = updateSearchSource(
        searchSourceInstance,
        dataViewMock,
        params,
        '2020-02-09T23:12:41.941Z',
        dateStart,
        dateEnd
      );
      const searchRequest = searchSource.getSearchRequestBody();
      expect(searchRequest.size).toMatchInlineSnapshot(`0`);
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
      expect(searchRequest.aggs).toMatchInlineSnapshot(`
        Object {
          "groupAgg": Object {
            "aggs": Object {
              "conditionSelector": Object {
                "bucket_selector": Object {
                  "buckets_path": Object {
                    "compareValue": "_count",
                  },
                  "script": "params.compareValue < 0L",
                },
              },
              "topHitsAgg": Object {
                "top_hits": Object {
                  "size": 100,
                },
              },
            },
            "terms": Object {
              "field": "host.name",
              "size": 10,
            },
          },
          "groupAggCount": Object {
            "stats_bucket": Object {
              "buckets_path": "groupAgg._count",
            },
          },
        }
      `);
    });
  });

  describe('getSmallerDataViewSpec', () => {
    it('should remove "count"s but keep other props like "customLabel"', async () => {
      const fieldsMap = {
        test1: {
          name: 'test1',
          type: 'keyword',
          aggregatable: true,
          searchable: true,
          readFromDocValues: false,
        },
        test2: {
          name: 'test2',
          type: 'keyword',
          aggregatable: true,
          searchable: true,
          readFromDocValues: false,
        },
        test3: {
          name: 'test3',
          type: 'keyword',
          aggregatable: true,
          searchable: true,
          readFromDocValues: false,
        },
      };
      expect(
        getSmallerDataViewSpec(
          createStubDataView({
            spec: {
              id: 'test',
              title: 'test*',
              fields: fieldsMap,
              fieldAttrs: undefined,
            },
          })
        )?.fieldAttrs
      ).toBeUndefined();
      expect(
        getSmallerDataViewSpec(
          createStubDataView({
            spec: {
              id: 'test',
              title: 'test*',
              fields: fieldsMap,
              fieldAttrs: {
                test1: {
                  count: 11,
                },
                test2: {
                  count: 12,
                },
              },
            },
          })
        )?.fieldAttrs
      ).toBeUndefined();
      expect(
        getSmallerDataViewSpec(
          createStubDataView({
            spec: {
              id: 'test',
              title: 'test*',
              fields: fieldsMap,
              fieldAttrs: {
                test1: {
                  count: 11,
                  customLabel: 'test11',
                },
                test2: {
                  count: 12,
                },
              },
            },
          })
        )?.fieldAttrs
      ).toMatchInlineSnapshot(`
        Object {
          "test1": Object {
            "customLabel": "test11",
          },
        }
      `);
      expect(
        getSmallerDataViewSpec(
          createStubDataView({
            spec: {
              id: 'test',
              title: 'test*',
              fields: fieldsMap,
              fieldAttrs: {
                test1: {
                  count: 11,
                  customLabel: 'test11',
                },
                test2: {
                  customLabel: 'test12',
                },
                test3: {
                  count: 30,
                },
              },
            },
          })
        )?.fieldAttrs
      ).toMatchInlineSnapshot(`
        Object {
          "test1": Object {
            "customLabel": "test11",
          },
          "test2": Object {
            "customLabel": "test12",
          },
        }
      `);
    });
  });
});
