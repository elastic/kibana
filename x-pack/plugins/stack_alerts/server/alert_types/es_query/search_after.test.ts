/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid/v4';
import { SearchResponse } from 'elasticsearch';
import type { Writable } from '@kbn/utility-types';
import { Logger } from 'src/core/server';
import { loggingSystemMock } from '../../../../../../src/core/server/mocks';
import { searchAfter, searchAfterCount, ExecuteEsQueryAlertParams } from './search_after';
import { alertsMock, AlertServicesMock } from '../../../../alerts/server/mocks';

const buildLogMessage = (({ id, alertName }: { alertName: string; id: string }) => (
  ...messages: string[]
) => [...messages, `name: "${alertName}"`, `id: "${id}"`].join(' '))({
  id: 'alertId',
  alertName: 'my test alert',
});

const DefaultAlertParams: Writable<Partial<ExecuteEsQueryAlertParams>> = {
  index: ['index-name'],
  timeField: 'timefield',
  esQuery: `{\n  \"query\":{\n    \"match_all\" : {}\n  }\n}`,
  timeWindowSize: 5,
  timeWindowUnit: 'm',
  date: 1610679325015,
};

const sampleDocWithSortId = (docId: string) => ({
  _index: 'testIndex',
  _type: 'doc',
  _score: 100,
  _version: 1,
  _id: docId,
  _source: {
    someKey: 'someValue',
    timefield: '2020-04-20T21:27:45+0000',
  },
  sort: ['1234567891111'],
});

const repeatedSearchResultsWithSortId = (
  total: number,
  pageSize: number,
  guids: string[]
): SearchResponse<unknown> => ({
  took: 10,
  timed_out: false,
  _shards: {
    total: 10,
    successful: 10,
    failed: 0,
    skipped: 0,
  },
  hits: {
    total,
    max_score: 100,
    hits: Array.from({ length: pageSize }).map((x, index) => ({
      ...sampleDocWithSortId(guids[index]),
    })),
  },
});

describe('searchAfter and searchAfterCount', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let alertParams: any;
  const mockService: AlertServicesMock = alertsMock.createAlertServices();
  const mockLogger: Logger = loggingSystemMock.createLogger();
  const someGuids = Array.from({ length: 14 }).map(() => uuid());

  beforeEach(() => {
    alertParams = { ...DefaultAlertParams };
    jest.clearAllMocks();
  });

  test('should throw error for invalid query json', async () => {
    alertParams.esQuery = `{\n  \"query\":{\n    \"match_all\" : {}\n  }\n`;
    await expect(
      searchAfter({
        logger: mockLogger,
        callCluster: mockService.callCluster,
        previousSortId: undefined,
        query: alertParams,
        buildLogMessage,
        handleSearchAfterResults: jest.fn(),
      })
    ).rejects.toThrow(
      `invalid query specified: \"{\n  \"query\":{\n    \"match_all\" : {}\n  }\n\" - query must be JSON`
    );
  });

  test('should throw error for invalid query with no query field', async () => {
    alertParams.esQuery = `{\n  \"aggs\":{\n    \"match_all\" : {}\n  }\n}`;
    await expect(
      searchAfter({
        logger: mockLogger,
        callCluster: mockService.callCluster,
        previousSortId: undefined,
        query: alertParams,
        buildLogMessage,
        handleSearchAfterResults: jest.fn(),
      })
    ).rejects.toThrow(
      `invalid query specified: \"{\n  \"aggs\":{\n    \"match_all\" : {}\n  }\n}\" - query must be JSON`
    );
  });

  test('should throw error for invalid time window', async () => {
    alertParams.timeWindowUnit = 'x';
    await expect(
      searchAfter({
        logger: mockLogger,
        callCluster: mockService.callCluster,
        previousSortId: undefined,
        query: alertParams,
        buildLogMessage,
        handleSearchAfterResults: jest.fn(),
      })
    ).rejects.toThrow(`invalid format for windowSize: \"5x\"`);
  });

  describe('searchAfter', () => {
    beforeEach(() => {
      alertParams = { ...DefaultAlertParams };
      jest.clearAllMocks();
    });

    test('should call handleSearchAfterResults after each search', async () => {
      const handleSearchAfterResults = jest.fn();
      const searchResultNoSortId = {
        took: 10,
        timed_out: false,
        _shards: {
          total: 10,
          successful: 10,
          failed: 0,
          skipped: 0,
        },
        hits: {
          total: 0,
          max_score: 100,
          hits: [
            {
              _index: 'testIndex',
              _type: 'doc',
              _score: 100,
              _version: 1,
              _id: someGuids[someGuids.length - 1],
              _source: {
                someKey: 'someValue',
                timefield: '2020-04-20T21:27:45+0000',
              },
              sort: [],
            },
          ],
        },
      };
      mockService.callCluster
        .mockResolvedValueOnce(repeatedSearchResultsWithSortId(4, 1, someGuids.slice(0, 3)))
        .mockResolvedValueOnce(repeatedSearchResultsWithSortId(4, 1, someGuids.slice(3, 6)))
        .mockResolvedValueOnce(repeatedSearchResultsWithSortId(4, 1, someGuids.slice(6, 9)))
        .mockResolvedValueOnce(repeatedSearchResultsWithSortId(4, 1, someGuids.slice(9, 12)))
        .mockResolvedValueOnce(searchResultNoSortId);

      await searchAfter({
        logger: mockLogger,
        callCluster: mockService.callCluster,
        previousSortId: undefined,
        query: alertParams,
        buildLogMessage,
        handleSearchAfterResults,
      });
      expect(mockService.callCluster).toHaveBeenCalledTimes(5);
      expect(handleSearchAfterResults).toHaveBeenCalledTimes(5);
      expect(handleSearchAfterResults).toHaveBeenNthCalledWith(
        1,
        repeatedSearchResultsWithSortId(4, 1, someGuids.slice(0, 3))
      );
      expect(handleSearchAfterResults).toHaveBeenNthCalledWith(
        2,
        repeatedSearchResultsWithSortId(4, 1, someGuids.slice(3, 6))
      );
      expect(handleSearchAfterResults).toHaveBeenNthCalledWith(
        3,
        repeatedSearchResultsWithSortId(4, 1, someGuids.slice(6, 9))
      );
      expect(handleSearchAfterResults).toHaveBeenNthCalledWith(
        4,
        repeatedSearchResultsWithSortId(4, 1, someGuids.slice(9, 12))
      );
      expect(handleSearchAfterResults).toHaveBeenNthCalledWith(5, searchResultNoSortId);
    });

    test('should skip calling handleSearchAfterResults if no search results', async () => {
      const handleSearchAfterResults = jest.fn();
      mockService.callCluster
        .mockResolvedValueOnce(repeatedSearchResultsWithSortId(4, 1, someGuids.slice(0, 3)))
        .mockResolvedValueOnce(repeatedSearchResultsWithSortId(4, 1, someGuids.slice(3, 6)))
        .mockResolvedValueOnce({
          took: 10,
          timed_out: false,
          _shards: {
            total: 10,
            successful: 10,
            failed: 0,
            skipped: 0,
          },
          hits: {
            total: 0,
            max_score: 100,
            hits: [],
          },
        });

      await searchAfter({
        logger: mockLogger,
        callCluster: mockService.callCluster,
        previousSortId: undefined,
        query: alertParams,
        buildLogMessage,
        handleSearchAfterResults,
      });
      expect(mockService.callCluster).toHaveBeenCalledTimes(3);
      expect(handleSearchAfterResults).toHaveBeenCalledTimes(2);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `searchResult.hits.hits.length was 0, exiting search_after loop name: \"my test alert\" id: \"alertId\"`
      );
    });
  });

  describe('searchAfterCount', () => {
    beforeEach(() => {
      alertParams = { ...DefaultAlertParams };
      jest.clearAllMocks();
    });

    test('should call handleSearchAfterResults if there are search results', async () => {
      const handleSearchAfterResults = jest.fn();
      const searchResult = {
        took: 10,
        timed_out: false,
        _shards: {
          total: 10,
          successful: 10,
          failed: 0,
          skipped: 0,
        },
        hits: {
          total: 100,
          max_score: 100,
          hits: [
            {
              _index: 'testIndex',
              _type: 'doc',
              _score: 100,
              _version: 1,
              _id: someGuids[someGuids.length - 1],
              _source: {
                someKey: 'someValue',
                timefield: '2020-04-20T21:27:45+0000',
              },
              sort: [],
            },
          ],
        },
      };
      mockService.callCluster.mockResolvedValueOnce(searchResult);

      await searchAfterCount({
        logger: mockLogger,
        callCluster: mockService.callCluster,
        previousSortId: undefined,
        query: alertParams,
        buildLogMessage,
        handleSearchAfterResults,
      });
      expect(mockService.callCluster).toHaveBeenCalledTimes(1);
      expect(handleSearchAfterResults).toHaveBeenCalledTimes(1);
      expect(handleSearchAfterResults).toHaveBeenNthCalledWith(1, searchResult);
    });

    test('should skip calling handleSearchAfterResults if no search results', async () => {
      const handleSearchAfterResults = jest.fn();
      mockService.callCluster.mockResolvedValueOnce({
        took: 10,
        timed_out: false,
        _shards: {
          total: 10,
          successful: 10,
          failed: 0,
          skipped: 0,
        },
        hits: {
          total: 0,
          max_score: 100,
          hits: [],
        },
      });

      await searchAfterCount({
        logger: mockLogger,
        callCluster: mockService.callCluster,
        previousSortId: undefined,
        query: alertParams,
        buildLogMessage,
        handleSearchAfterResults,
      });
      expect(mockService.callCluster).toHaveBeenCalledTimes(1);
      expect(handleSearchAfterResults).toHaveBeenCalledTimes(0);
    });
  });
});
