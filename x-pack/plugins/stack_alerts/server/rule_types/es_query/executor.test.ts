/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import { CoreSetup } from '@kbn/core/server';
import { executor, getSearchParams, getValidTimefieldSort, tryToParseAsDate } from './executor';
import { ExecutorOptions, OnlyEsQueryRuleParams } from './types';
import { Comparator } from '../../../common/comparator_types';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { createSearchSourceMock } from '@kbn/data-plugin/common/search/search_source/mocks';
import { ISearchStartSearchSource } from '@kbn/data-plugin/common';
import { EsQueryRuleParams } from './rule_type_params';
import { FetchEsQueryOpts } from './lib/fetch_es_query';
import { FetchSearchSourceQueryOpts } from './lib/fetch_search_source_query';

const logger = loggerMock.create();
const scopedClusterClientMock = elasticsearchServiceMock.createScopedClusterClient();
const createSearchSourceClientMock = () => {
  const searchSourceMock = createSearchSourceMock();
  searchSourceMock.fetch$ = jest.fn().mockImplementation(() => of({ rawResponse: { took: 5 } }));

  return {
    searchSourceMock,
    searchSourceClientMock: {
      create: jest.fn().mockReturnValue(searchSourceMock),
      createEmpty: jest.fn().mockReturnValue(searchSourceMock),
    } as unknown as ISearchStartSearchSource,
  };
};

const { searchSourceClientMock } = createSearchSourceClientMock();

const mockFetchEsQuery = jest.fn();
jest.mock('./lib/fetch_es_query', () => ({
  fetchEsQuery: (...args: [FetchEsQueryOpts]) => mockFetchEsQuery(...args),
}));
const mockFetchSearchSourceQuery = jest.fn();
jest.mock('./lib/fetch_search_source_query', () => ({
  fetchSearchSourceQuery: (...args: [FetchSearchSourceQueryOpts]) =>
    mockFetchSearchSourceQuery(...args),
}));

const scheduleActions = jest.fn();
const replaceState = jest.fn(() => ({ scheduleActions }));
const mockCreateAlert = jest.fn(() => ({ replaceState }));
const mockGetRecoveredAlerts = jest.fn().mockReturnValue([]);
const mockSetLimitReached = jest.fn();

const mockNow = jest.getRealSystemTime();

describe('es_query executor', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(mockNow);
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });
  afterAll(() => {
    jest.useRealTimers();
  });

  const defaultProps = {
    size: 3,
    timeWindowSize: 5,
    timeWindowUnit: 'm',
    threshold: [],
    thresholdComparator: '>=' as Comparator,
    esQuery: '{ "query": "test-query" }',
    index: ['test-index'],
    timeField: '',
    searchType: 'esQuery',
    excludeHitsFromPreviousRun: true,
    aggType: 'count',
    groupBy: 'all',
  };

  describe('executor', () => {
    const services = {
      scopedClusterClient: scopedClusterClientMock,
      savedObjectsClient: {
        get: () => ({ attributes: { consumer: 'alerts' } }),
      },
      searchSourceClient: searchSourceClientMock,
      alertFactory: {
        create: mockCreateAlert,
        alertLimit: {
          getValue: jest.fn().mockReturnValue(1000),
          setLimitReached: mockSetLimitReached,
        },
        done: () => ({
          getRecoveredAlerts: mockGetRecoveredAlerts,
        }),
      },
      alertWithLifecycle: jest.fn(),
      logger,
      shouldWriteAlerts: () => true,
    };
    const coreMock = {
      http: { basePath: { publicBaseUrl: 'https://localhost:5601' } },
    } as CoreSetup;
    const defaultExecutorOptions = {
      params: defaultProps,
      services,
      rule: { id: 'test-rule-id', name: 'test-rule-name' },
      state: { latestTimestamp: undefined },
      spaceId: 'default',
      logger,
    } as unknown as ExecutorOptions<EsQueryRuleParams>;

    it('should throw error for invalid comparator', async () => {
      await expect(() =>
        executor(coreMock, {
          ...defaultExecutorOptions,
          // @ts-expect-error
          params: { ...defaultProps, thresholdComparator: '?' },
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(`"invalid thresholdComparator specified: ?"`);
    });

    it('should call fetchEsQuery if searchType is esQuery', async () => {
      mockFetchEsQuery.mockResolvedValueOnce({
        parsedResults: {
          results: [
            {
              group: 'all documents',
              count: 491,
              hits: [],
            },
          ],
          truncated: false,
        },
        dateStart: new Date().toISOString(),
        dateEnd: new Date().toISOString(),
      });
      await executor(coreMock, defaultExecutorOptions);
      expect(mockFetchEsQuery).toHaveBeenCalledWith({
        ruleId: 'test-rule-id',
        name: 'test-rule-name',
        alertLimit: 1000,
        params: defaultProps,
        publicBaseUrl: 'https://localhost:5601',
        spacePrefix: '',
        timestamp: undefined,
        services: {
          scopedClusterClient: scopedClusterClientMock,
          logger,
        },
      });
      expect(mockFetchSearchSourceQuery).not.toHaveBeenCalled();
    });

    it('should call fetchSearchSourceQuery if searchType is searchSource', async () => {
      mockFetchSearchSourceQuery.mockResolvedValueOnce({
        parsedResults: {
          results: [
            {
              group: 'all documents',
              count: 491,
              hits: [],
            },
          ],
          truncated: false,
        },
        dateStart: new Date().toISOString(),
        dateEnd: new Date().toISOString(),
      });
      await executor(coreMock, {
        ...defaultExecutorOptions,
        params: { ...defaultProps, searchConfiguration: {}, searchType: 'searchSource' },
      });
      expect(mockFetchSearchSourceQuery).toHaveBeenCalledWith({
        ruleId: 'test-rule-id',
        alertLimit: 1000,
        params: { ...defaultProps, searchConfiguration: {}, searchType: 'searchSource' },
        latestTimestamp: undefined,
        services: {
          searchSourceClient: searchSourceClientMock,
          logger,
          share: undefined,
        },
        spacePrefix: '',
      });
      expect(mockFetchEsQuery).not.toHaveBeenCalled();
    });

    it('should not create alert if compare function returns false for ungrouped alert', async () => {
      mockFetchEsQuery.mockResolvedValueOnce({
        parsedResults: {
          results: [
            {
              group: 'all documents',
              count: 491,
              hits: [],
            },
          ],
          truncated: false,
        },
        dateStart: new Date().toISOString(),
        dateEnd: new Date().toISOString(),
      });
      await executor(coreMock, {
        ...defaultExecutorOptions,
        // @ts-expect-error
        params: { ...defaultProps, threshold: [500], thresholdComparator: '>=' as Comparator },
      });

      expect(mockCreateAlert).not.toHaveBeenCalled();
      expect(mockSetLimitReached).toHaveBeenCalledTimes(1);
      expect(mockSetLimitReached).toHaveBeenCalledWith(false);
    });

    it('should create alert if compare function returns true for ungrouped alert', async () => {
      mockFetchEsQuery.mockResolvedValueOnce({
        parsedResults: {
          results: [
            {
              group: 'all documents',
              count: 491,
              hits: [],
            },
          ],
          truncated: false,
        },
        dateStart: new Date().toISOString(),
        dateEnd: new Date().toISOString(),
        link: 'https://localhost:5601/app/management/insightsAndAlerting/triggersActions/rule/test-rule-id',
      });
      await executor(coreMock, {
        ...defaultExecutorOptions,
        // @ts-expect-error
        params: { ...defaultProps, threshold: [200], thresholdComparator: '>=' as Comparator },
      });

      expect(mockCreateAlert).toHaveBeenCalledTimes(1);
      expect(mockCreateAlert).toHaveBeenNthCalledWith(1, 'query matched');
      expect(scheduleActions).toHaveBeenCalledTimes(1);
      expect(scheduleActions).toHaveBeenNthCalledWith(1, 'query matched', {
        conditions: 'Number of matching documents is greater than or equal to 200',
        date: new Date(mockNow).toISOString(),
        hits: [],
        link: 'https://localhost:5601/app/management/insightsAndAlerting/triggersActions/rule/test-rule-id',
        message: `rule 'test-rule-name' is active:

- Value: 491
- Conditions Met: Number of matching documents is greater than or equal to 200 over 5m
- Timestamp: ${new Date(mockNow).toISOString()}
- Link: https://localhost:5601/app/management/insightsAndAlerting/triggersActions/rule/test-rule-id`,
        title: "rule 'test-rule-name' matched query",
        value: 491,
      });
      expect(mockSetLimitReached).toHaveBeenCalledTimes(1);
      expect(mockSetLimitReached).toHaveBeenCalledWith(false);
    });

    it('should create as many alerts as number of results in parsedResults for grouped alert', async () => {
      mockFetchEsQuery.mockResolvedValueOnce({
        parsedResults: {
          results: [
            {
              group: 'host-1',
              count: 291,
              hits: [],
            },
            {
              group: 'host-2',
              count: 477,
              hits: [],
            },
            {
              group: 'host-3',
              count: 999,
              hits: [],
            },
          ],
          truncated: false,
        },
        dateStart: new Date().toISOString(),
        dateEnd: new Date().toISOString(),
        link: 'https://localhost:5601/app/management/insightsAndAlerting/triggersActions/rule/test-rule-id',
      });
      await executor(coreMock, {
        ...defaultExecutorOptions,
        // @ts-expect-error
        params: {
          ...defaultProps,
          threshold: [200],
          thresholdComparator: '>=' as Comparator,
          groupBy: 'top',
          termSize: 10,
          termField: 'host.name',
        },
      });

      expect(mockCreateAlert).toHaveBeenCalledTimes(3);
      expect(mockCreateAlert).toHaveBeenNthCalledWith(1, 'host-1');
      expect(mockCreateAlert).toHaveBeenNthCalledWith(2, 'host-2');
      expect(mockCreateAlert).toHaveBeenNthCalledWith(3, 'host-3');
      expect(scheduleActions).toHaveBeenCalledTimes(3);
      expect(scheduleActions).toHaveBeenNthCalledWith(1, 'query matched', {
        conditions:
          'Number of matching documents for group "host-1" is greater than or equal to 200',
        date: new Date(mockNow).toISOString(),
        hits: [],
        link: 'https://localhost:5601/app/management/insightsAndAlerting/triggersActions/rule/test-rule-id',
        message: `rule 'test-rule-name' is active:

- Value: 291
- Conditions Met: Number of matching documents for group "host-1" is greater than or equal to 200 over 5m
- Timestamp: ${new Date(mockNow).toISOString()}
- Link: https://localhost:5601/app/management/insightsAndAlerting/triggersActions/rule/test-rule-id`,
        title: "rule 'test-rule-name' matched query for group host-1",
        value: 291,
      });
      expect(scheduleActions).toHaveBeenNthCalledWith(2, 'query matched', {
        conditions:
          'Number of matching documents for group "host-2" is greater than or equal to 200',
        date: new Date(mockNow).toISOString(),
        hits: [],
        link: 'https://localhost:5601/app/management/insightsAndAlerting/triggersActions/rule/test-rule-id',
        message: `rule 'test-rule-name' is active:

- Value: 477
- Conditions Met: Number of matching documents for group "host-2" is greater than or equal to 200 over 5m
- Timestamp: ${new Date(mockNow).toISOString()}
- Link: https://localhost:5601/app/management/insightsAndAlerting/triggersActions/rule/test-rule-id`,
        title: "rule 'test-rule-name' matched query for group host-2",
        value: 477,
      });
      expect(scheduleActions).toHaveBeenNthCalledWith(3, 'query matched', {
        conditions:
          'Number of matching documents for group "host-3" is greater than or equal to 200',
        date: new Date(mockNow).toISOString(),
        hits: [],
        link: 'https://localhost:5601/app/management/insightsAndAlerting/triggersActions/rule/test-rule-id',
        message: `rule 'test-rule-name' is active:

- Value: 999
- Conditions Met: Number of matching documents for group "host-3" is greater than or equal to 200 over 5m
- Timestamp: ${new Date(mockNow).toISOString()}
- Link: https://localhost:5601/app/management/insightsAndAlerting/triggersActions/rule/test-rule-id`,
        title: "rule 'test-rule-name' matched query for group host-3",
        value: 999,
      });
      expect(mockSetLimitReached).toHaveBeenCalledTimes(1);
      expect(mockSetLimitReached).toHaveBeenCalledWith(false);
    });

    it('should set limit as reached if results are truncated', async () => {
      mockFetchEsQuery.mockResolvedValueOnce({
        parsedResults: {
          results: [
            {
              group: 'host-1',
              count: 291,
              hits: [],
            },
            {
              group: 'host-2',
              count: 477,
              hits: [],
            },
            {
              group: 'host-3',
              count: 999,
              hits: [],
            },
          ],
          truncated: true,
        },
        dateStart: new Date().toISOString(),
        dateEnd: new Date().toISOString(),
      });
      await executor(coreMock, {
        ...defaultExecutorOptions,
        // @ts-expect-error
        params: {
          ...defaultProps,
          threshold: [200],
          thresholdComparator: '>=' as Comparator,
          groupBy: 'top',
          termSize: 10,
          termField: 'host.name',
        },
      });

      expect(mockCreateAlert).toHaveBeenCalledTimes(3);
      expect(mockCreateAlert).toHaveBeenNthCalledWith(1, 'host-1');
      expect(mockCreateAlert).toHaveBeenNthCalledWith(2, 'host-2');
      expect(mockCreateAlert).toHaveBeenNthCalledWith(3, 'host-3');
      expect(scheduleActions).toHaveBeenCalledTimes(3);
      expect(mockSetLimitReached).toHaveBeenCalledTimes(1);
      expect(mockSetLimitReached).toHaveBeenCalledWith(true);
    });

    it('should correctly handle recovered alerts for ungrouped alert', async () => {
      const mockSetContext = jest.fn();
      mockGetRecoveredAlerts.mockReturnValueOnce([
        {
          getId: () => 'query matched',
          setContext: mockSetContext,
        },
      ]);
      mockFetchEsQuery.mockResolvedValueOnce({
        parsedResults: {
          results: [
            {
              group: 'all documents',
              count: 491,
              hits: [],
            },
          ],
          truncated: false,
        },
        dateStart: new Date().toISOString(),
        dateEnd: new Date().toISOString(),
        link: 'https://localhost:5601/app/management/insightsAndAlerting/triggersActions/rule/test-rule-id',
      });
      await executor(coreMock, {
        ...defaultExecutorOptions,
        // @ts-expect-error
        params: { ...defaultProps, threshold: [500], thresholdComparator: '>=' as Comparator },
      });

      expect(mockCreateAlert).not.toHaveBeenCalled();
      expect(mockSetContext).toHaveBeenCalledTimes(1);
      expect(mockSetContext).toHaveBeenNthCalledWith(1, {
        conditions: 'Number of matching documents is NOT greater than or equal to 500',
        date: new Date(mockNow).toISOString(),
        hits: [],
        link: 'https://localhost:5601/app/management/insightsAndAlerting/triggersActions/rule/test-rule-id',
        message: `rule 'test-rule-name' is recovered:

- Value: 0
- Conditions Met: Number of matching documents is NOT greater than or equal to 500 over 5m
- Timestamp: ${new Date(mockNow).toISOString()}
- Link: https://localhost:5601/app/management/insightsAndAlerting/triggersActions/rule/test-rule-id`,
        title: "rule 'test-rule-name' recovered",
        value: 0,
      });
      expect(mockSetLimitReached).toHaveBeenCalledTimes(1);
      expect(mockSetLimitReached).toHaveBeenCalledWith(false);
    });

    it('should correctly handle recovered alerts for grouped alerts', async () => {
      const mockSetContext = jest.fn();
      mockGetRecoveredAlerts.mockReturnValueOnce([
        {
          getId: () => 'host-1',
          setContext: mockSetContext,
        },
        {
          getId: () => 'host-2',
          setContext: mockSetContext,
        },
      ]);
      mockFetchEsQuery.mockResolvedValueOnce({
        parsedResults: { results: [], truncated: false },
        dateStart: new Date().toISOString(),
        dateEnd: new Date().toISOString(),
        link: 'https://localhost:5601/app/management/insightsAndAlerting/triggersActions/rule/test-rule-id',
      });
      await executor(coreMock, {
        ...defaultExecutorOptions,
        // @ts-expect-error
        params: {
          ...defaultProps,
          threshold: [200],
          thresholdComparator: '>=' as Comparator,
          groupBy: 'top',
          termSize: 10,
          termField: 'host.name',
        },
      });

      expect(mockCreateAlert).not.toHaveBeenCalled();
      expect(mockSetContext).toHaveBeenCalledTimes(2);
      expect(mockSetContext).toHaveBeenNthCalledWith(1, {
        conditions: `Number of matching documents for group "host-1" is NOT greater than or equal to 200`,
        date: new Date(mockNow).toISOString(),
        hits: [],
        link: 'https://localhost:5601/app/management/insightsAndAlerting/triggersActions/rule/test-rule-id',
        message: `rule 'test-rule-name' is recovered:

- Value: 0
- Conditions Met: Number of matching documents for group "host-1" is NOT greater than or equal to 200 over 5m
- Timestamp: ${new Date(mockNow).toISOString()}
- Link: https://localhost:5601/app/management/insightsAndAlerting/triggersActions/rule/test-rule-id`,
        title: "rule 'test-rule-name' recovered",
        value: 0,
      });
      expect(mockSetContext).toHaveBeenNthCalledWith(2, {
        conditions: `Number of matching documents for group "host-2" is NOT greater than or equal to 200`,
        date: new Date(mockNow).toISOString(),
        hits: [],
        link: 'https://localhost:5601/app/management/insightsAndAlerting/triggersActions/rule/test-rule-id',
        message: `rule 'test-rule-name' is recovered:

- Value: 0
- Conditions Met: Number of matching documents for group "host-2" is NOT greater than or equal to 200 over 5m
- Timestamp: ${new Date(mockNow).toISOString()}
- Link: https://localhost:5601/app/management/insightsAndAlerting/triggersActions/rule/test-rule-id`,
        title: "rule 'test-rule-name' recovered",
        value: 0,
      });
      expect(mockSetLimitReached).toHaveBeenCalledTimes(1);
      expect(mockSetLimitReached).toHaveBeenCalledWith(false);
    });
  });

  describe('tryToParseAsDate', () => {
    it.each<[string | number]>([['2019-01-01T00:00:00.000Z'], [1546300800000]])(
      'should parse as date correctly',
      (value) => {
        expect(tryToParseAsDate(value)).toBe('2019-01-01T00:00:00.000Z');
      }
    );
    it.each<[string | null | undefined]>([[null], ['invalid date'], [undefined]])(
      'should not parse as date',
      (value) => {
        expect(tryToParseAsDate(value)).toBe(undefined);
      }
    );
  });

  describe('getValidTimefieldSort', () => {
    it('should return valid time field', () => {
      const result = getValidTimefieldSort([
        null,
        'invalid date',
        '2018-12-31T19:00:00.000Z',
        1546282800000,
      ]);
      expect(result).toEqual('2018-12-31T19:00:00.000Z');
    });
  });

  describe('getSearchParams', () => {
    it('should return search params correctly', () => {
      const result = getSearchParams(defaultProps as OnlyEsQueryRuleParams);
      expect(result.parsedQuery.query).toBe('test-query');
    });

    it('should throw invalid query error', () => {
      expect(() =>
        getSearchParams({ ...defaultProps, esQuery: '' } as OnlyEsQueryRuleParams)
      ).toThrow('invalid query specified: "" - query must be JSON');
    });

    it('should throw invalid query error due to missing query property', () => {
      expect(() =>
        getSearchParams({
          ...defaultProps,
          esQuery: '{ "someProperty": "test-query" }',
        } as OnlyEsQueryRuleParams)
      ).toThrow('invalid query specified: "{ "someProperty": "test-query" }" - query must be JSON');
    });

    it('should throw invalid window size error', () => {
      expect(() =>
        getSearchParams({
          ...defaultProps,
          timeWindowSize: 5,
          timeWindowUnit: 'r',
        } as OnlyEsQueryRuleParams)
      ).toThrow('invalid format for windowSize: "5r"');
    });
  });
});
