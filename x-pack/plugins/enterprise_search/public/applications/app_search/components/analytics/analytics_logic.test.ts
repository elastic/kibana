/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  LogicMounter,
  mockKibanaValues,
  mockHttpValues,
  mockFlashMessageHelpers,
  expectedAsyncError,
} from '../../../__mocks__';

jest.mock('../engine', () => ({
  EngineLogic: { values: { engineName: 'test-engine' } },
}));

import { AnalyticsLogic } from './';

describe('AnalyticsLogic', () => {
  const { mount } = new LogicMounter(AnalyticsLogic);
  const { history } = mockKibanaValues;
  const { http } = mockHttpValues;
  const { flashAPIErrors } = mockFlashMessageHelpers;

  const DEFAULT_VALUES = {
    dataLoading: true,
    analyticsUnavailable: false,
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
    analyticsUnavailable: false,
    allTags: ['some-tag'],
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
    analyticsUnavailable: false,
    allTags: ['some-tag'],
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
    describe('onAnalyticsUnavailable', () => {
      it('should set state', () => {
        mount();
        AnalyticsLogic.actions.onAnalyticsUnavailable();

        expect(AnalyticsLogic.values).toEqual({
          ...DEFAULT_VALUES,
          dataLoading: false,
          analyticsUnavailable: true,
        });
      });
    });

    describe('onAnalyticsDataLoad', () => {
      it('should set state', () => {
        mount();
        AnalyticsLogic.actions.onAnalyticsDataLoad(MOCK_ANALYTICS_RESPONSE);

        expect(AnalyticsLogic.values).toEqual({
          ...DEFAULT_VALUES,
          dataLoading: false,
          analyticsUnavailable: false,
          // TODO: more state will get set here in future PRs
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
          analyticsUnavailable: false,
          // TODO: more state will get set here in future PRs
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
        const promise = Promise.resolve(MOCK_ANALYTICS_RESPONSE);
        http.get.mockReturnValueOnce(promise);
        mount();
        jest.spyOn(AnalyticsLogic.actions, 'onAnalyticsDataLoad');

        AnalyticsLogic.actions.loadAnalyticsData();
        await promise;

        expect(http.get).toHaveBeenCalledWith(
          '/api/app_search/engines/test-engine/analytics/queries',
          {
            query: { size: 20 },
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
          '/api/app_search/engines/test-engine/analytics/queries',
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

      it('calls onAnalyticsUnavailable if analyticsUnavailable is in response', async () => {
        const promise = Promise.resolve({ analyticsUnavailable: true });
        http.get.mockReturnValueOnce(promise);
        mount();
        jest.spyOn(AnalyticsLogic.actions, 'onAnalyticsUnavailable');

        AnalyticsLogic.actions.loadAnalyticsData();
        await promise;

        expect(AnalyticsLogic.actions.onAnalyticsUnavailable).toHaveBeenCalled();
      });

      it('handles errors', async () => {
        const promise = Promise.reject('error');
        http.get.mockReturnValueOnce(promise);
        mount();
        jest.spyOn(AnalyticsLogic.actions, 'onAnalyticsUnavailable');

        AnalyticsLogic.actions.loadAnalyticsData();
        await expectedAsyncError(promise);

        expect(flashAPIErrors).toHaveBeenCalledWith('error');
        expect(AnalyticsLogic.actions.onAnalyticsUnavailable).toHaveBeenCalled();
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
        const promise = Promise.resolve(MOCK_QUERY_RESPONSE);
        http.get.mockReturnValueOnce(promise);
        mount();
        jest.spyOn(AnalyticsLogic.actions, 'onQueryDataLoad');

        AnalyticsLogic.actions.loadQueryData('some-query');
        await promise;

        expect(http.get).toHaveBeenCalledWith(
          '/api/app_search/engines/test-engine/analytics/queries/some-query',
          expect.any(Object) // empty query obj
        );
        expect(AnalyticsLogic.actions.onQueryDataLoad).toHaveBeenCalledWith(MOCK_QUERY_RESPONSE);
      });

      it('parses and passes the current search query string', async () => {
        (http.get as jest.Mock).mockReturnValueOnce({});
        history.location.search = '?start=1970-12-30&end=1970-12-31&&tag=another_tag';
        mount();

        AnalyticsLogic.actions.loadQueryData('some-query');

        expect(http.get).toHaveBeenCalledWith(
          '/api/app_search/engines/test-engine/analytics/queries/some-query',
          {
            query: {
              start: '1970-12-30',
              end: '1970-12-31',
              tag: 'another_tag',
            },
          }
        );
      });

      it('calls onAnalyticsUnavailable if analyticsUnavailable is in response', async () => {
        const promise = Promise.resolve({ analyticsUnavailable: true });
        http.get.mockReturnValueOnce(promise);
        mount();
        jest.spyOn(AnalyticsLogic.actions, 'onAnalyticsUnavailable');

        AnalyticsLogic.actions.loadQueryData('some-query');
        await promise;

        expect(AnalyticsLogic.actions.onAnalyticsUnavailable).toHaveBeenCalled();
      });

      it('handles errors', async () => {
        const promise = Promise.reject('error');
        http.get.mockReturnValueOnce(promise);
        mount();
        jest.spyOn(AnalyticsLogic.actions, 'onAnalyticsUnavailable');

        AnalyticsLogic.actions.loadQueryData('some-query');
        await expectedAsyncError(promise);

        expect(flashAPIErrors).toHaveBeenCalledWith('error');
        expect(AnalyticsLogic.actions.onAnalyticsUnavailable).toHaveBeenCalled();
      });
    });
  });
});
