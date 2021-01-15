/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid/v4';
import { SearchResponse } from 'elasticsearch';
import { Logger } from 'src/core/server';
import { loggingSystemMock } from '../../../../../../src/core/server/mocks';
import { singleSearchAfter } from './single_search_after';
import { alertsMock, AlertServicesMock } from '../../../../alerts/server/mocks';

const buildLogMessage = (({ id, alertName }: { alertName: string; id: string }) => (
  ...messages: string[]
) => [...messages, `name: "${alertName}"`, `id: "${id}"`].join(' '))({
  id: 'alertId',
  alertName: 'my test alert',
});

const sampleDoc = (docId: string, withSortId: boolean = false) => ({
  _index: 'testIndex',
  _type: 'doc',
  _score: 100,
  _id: docId,
  _source: {
    someKey: 'someValue',
    timefield: '2020-04-20T21:27:45+0000',
  },
  ...(withSortId ? { sort: ['1234567891111'] } : {}),
});

const sampleDocSearchResults = (
  docId: string,
  withSortId: boolean = false
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
    total: 100,
    max_score: 100,
    hits: [
      {
        ...sampleDoc(docId, withSortId),
      },
    ],
  },
});

describe('singleSearchAfter', () => {
  const mockLogger: Logger = loggingSystemMock.createLogger();
  const mockService: AlertServicesMock = alertsMock.createAlertServices();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('singleSearchAfter should work without a given sort id', async () => {
    const docId = uuid();
    mockService.callCluster.mockResolvedValue(sampleDocSearchResults(docId));
    const { searchResult } = await singleSearchAfter({
      searchAfterSortId: undefined,
      index: [],
      from: '2020-04-20T20:27:45+0000',
      to: '2020-04-20T23:27:45+0000',
      callCluster: mockService.callCluster,
      logger: mockLogger,
      pageSize: 1,
      filter: undefined,
      timeField: 'timefield',
      buildLogMessage,
    });
    expect(searchResult).toEqual(sampleDocSearchResults(docId));
  });

  test('singleSearchAfter should work with a given sort id', async () => {
    const docId = uuid();
    const searchAfterSortId = '1234567891111';
    mockService.callCluster.mockResolvedValue(sampleDocSearchResults(docId, true));
    const { searchResult } = await singleSearchAfter({
      searchAfterSortId,
      index: [],
      from: '2020-04-20T20:27:45+0000',
      to: '2020-04-20T23:27:45+0000',
      callCluster: mockService.callCluster,
      logger: mockLogger,
      pageSize: 1,
      filter: undefined,
      timeField: 'timefield',
      buildLogMessage,
    });
    expect(searchResult).toEqual(sampleDocSearchResults(docId, true));
  });

  test('singleSearchAfter should throw error if search errors', async () => {
    const searchAfterSortId = '1234567891111';
    mockService.callCluster.mockImplementation(async () => {
      throw Error('Fake Error');
    });
    await expect(
      singleSearchAfter({
        searchAfterSortId,
        index: [],
        from: '2020-04-20T20:27:45+0000',
        to: '2020-04-20T23:27:45+0000',
        callCluster: mockService.callCluster,
        logger: mockLogger,
        pageSize: 1,
        filter: undefined,
        timeField: 'timefield',
        buildLogMessage,
      })
    ).rejects.toThrow('Fake Error');
  });
});
