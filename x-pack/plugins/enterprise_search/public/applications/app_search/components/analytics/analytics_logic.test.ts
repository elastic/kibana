/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter, mockKibanaValues, mockHttpValues } from '../../../__mocks__/kea_logic';

jest.mock('../engine', () => ({
  EngineLogic: { values: { engineName: 'test-engine' } },
}));

import { nextTick } from '@kbn/test-jest-helpers';

import { itShowsServerErrorAsFlashMessage } from '../../../test_helpers';

import { DEFAULT_START_DATE, DEFAULT_END_DATE } from './constants';

import { AnalyticsLogic } from '.';

describe('AnalyticsLogic', () => {
  const { mount } = new LogicMounter(AnalyticsLogic);
  const { history } = mockKibanaValues;
  const { http } = mockHttpValues;

  const DEFAULT_VALUES = {
    dataLoading: true,
    allTags: [],
    recentQueries: [],
    topQueries: [],
    topQueriesNoResults: [],
    topQueriesNoClicks: [],
    topQueriesWithClicks: [],
    totalQueries: 0,
    totalQueriesNoResults: 0,
    totalClicks: 0,
    totalQueriesForQuery: 0,
    queriesPerDay: [],
    queriesNoResultsPerDay: [],
    clicksPerDay: [],
    queriesPerDayForQuery: [],
    topClicksForQuery: [],
    startDate: '',
  };

  const MOCK_TOP_QUERIES = [
    {
      doc_count: 5,
      key: 'some-key',
    },
    {
      doc_count: 0,
      key: 'another-key',
    },
  ];
  const MOCK_RECENT_QUERIES = [
    {
      document_ids: ['1', '2'],
      query_string: 'some-query',
      tags: ['some-tag'],
      timestamp: 'some-timestamp',
    },
  ];
  const MOCK_TOP_CLICKS = [
    {
      key: 'highly-clicked-query',
      doc_count: 1,
      document: {
        id: 'some-id',
        engine: 'some-engine',
        tags: [],
      },
      clicks: {
        doc_count: 100,
      },
    },
  ];
  const MOCK_ANALYTICS_RESPONSE = {
    allTags: ['some-tag'],
    startDate: '1970-01-01',
    recentQueries: MOCK_RECENT_QUERIES,
    topQueries: MOCK_TOP_QUERIES,
    topQueriesNoResults: MOCK_TOP_QUERIES,
    topQueriesNoClicks: MOCK_TOP_QUERIES,
    topQueriesWithClicks: MOCK_TOP_QUERIES,
    totalClicks: 1000,
    totalQueries: 5000,
    totalQueriesNoResults: 500,
    clicksPerDay: [0, 10, 50],
    queriesPerDay: [10, 50, 100],
    queriesNoResultsPerDay: [1, 2, 3],
  };
  const MOCK_QUERY_RESPONSE = {
    allTags: ['some-tag'],
    startDate: '1970-01-01',
    totalQueriesForQuery: 50,
    queriesPerDayForQuery: [25, 0, 25],
    topClicksForQuery: MOCK_TOP_CLICKS,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    history.location.search = '';
  });

  it('has expected default values', () => {
    mount();
    expect(AnalyticsLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {
    describe('onAnalyticsDataLoad', () => {
      it('should set state', () => {
        mount();
        AnalyticsLogic.actions.onAnalyticsDataLoad(MOCK_ANALYTICS_RESPONSE);

        expect(AnalyticsLogic.values).toEqual({
          ...DEFAULT_VALUES,
          dataLoading: false,
          ...MOCK_ANALYTICS_RESPONSE,
        });
      });
    });

    describe('onQueryDataLoad', () => {
      it('should set state', () => {
        mount();
        AnalyticsLogic.actions.onQueryDataLoad(MOCK_QUERY_RESPONSE);

        expect(AnalyticsLogic.values).toEqual({
          ...DEFAULT_VALUES,
          dataLoading: false,
          ...MOCK_QUERY_RESPONSE,
        });
      });
    });
  });

  describe('listeners', () => {
    describe('loadAnalyticsData', () => {
      it('should set state', () => {
        mount({ dataLoading: false });

        AnalyticsLogic.actions.loadAnalyticsData();

        expect(AnalyticsLogic.values).toEqual({
          ...DEFAULT_VALUES,
          dataLoading: true,
        });
      });

      it('should make an API call and set state based on the response', async () => {
        http.get.mockReturnValueOnce(Promise.resolve(MOCK_ANALYTICS_RESPONSE));
        mount();
        jest.spyOn(AnalyticsLogic.actions, 'onAnalyticsDataLoad');

        AnalyticsLogic.actions.loadAnalyticsData();
        await nextTick();

        expect(http.get).toHaveBeenCalledWith(
          '/internal/app_search/engines/test-engine/analytics/queries',
          {
            query: {
              start: DEFAULT_START_DATE,
              end: DEFAULT_END_DATE,
              size: 20,
            },
          }
        );
        expect(AnalyticsLogic.actions.onAnalyticsDataLoad).toHaveBeenCalledWith(
          MOCK_ANALYTICS_RESPONSE
        );
      });

      it('parses and passes the current search query string', async () => {
        (http.get as jest.Mock).mockReturnValueOnce({});
        history.location.search = '?start=1970-01-01&end=1970-01-02&&tag=some_tag';
        mount();

        AnalyticsLogic.actions.loadAnalyticsData();

        expect(http.get).toHaveBeenCalledWith(
          '/internal/app_search/engines/test-engine/analytics/queries',
          {
            query: {
              start: '1970-01-01',
              end: '1970-01-02',
              tag: 'some_tag',
              size: 20,
            },
          }
        );
      });

      itShowsServerErrorAsFlashMessage(http.get, () => {
        mount();
        AnalyticsLogic.actions.loadAnalyticsData();
      });
    });

    describe('loadQueryData', () => {
      it('should set state', () => {
        mount({ dataLoading: false });

        AnalyticsLogic.actions.loadQueryData('some-query');

        expect(AnalyticsLogic.values).toEqual({
          ...DEFAULT_VALUES,
          dataLoading: true,
        });
      });

      it('should make an API call and set state based on the response', async () => {
        http.get.mockReturnValueOnce(Promise.resolve(MOCK_QUERY_RESPONSE));
        mount();
        jest.spyOn(AnalyticsLogic.actions, 'onQueryDataLoad');

        AnalyticsLogic.actions.loadQueryData('some-query');
        await nextTick();

        expect(http.get).toHaveBeenCalledWith(
          '/internal/app_search/engines/test-engine/analytics/queries/some-query',
          {
            query: {
              start: DEFAULT_START_DATE,
              end: DEFAULT_END_DATE,
            },
          }
        );
        expect(AnalyticsLogic.actions.onQueryDataLoad).toHaveBeenCalledWith(MOCK_QUERY_RESPONSE);
      });

      it('parses and passes the current search query string', async () => {
        (http.get as jest.Mock).mockReturnValueOnce({});
        history.location.search = '?start=1970-12-30&end=1970-12-31&&tag=another_tag';
        mount();

        AnalyticsLogic.actions.loadQueryData('some-query');

        expect(http.get).toHaveBeenCalledWith(
          '/internal/app_search/engines/test-engine/analytics/queries/some-query',
          {
            query: {
              start: '1970-12-30',
              end: '1970-12-31',
              tag: 'another_tag',
            },
          }
        );
      });

      itShowsServerErrorAsFlashMessage(http.get, () => {
        mount();
        AnalyticsLogic.actions.loadQueryData('some-query');
      });
    });
  });
});
