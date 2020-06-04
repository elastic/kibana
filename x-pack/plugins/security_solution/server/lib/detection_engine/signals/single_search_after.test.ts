/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  sampleDocSearchResultsNoSortId,
  mockLogger,
  sampleDocSearchResultsWithSortId,
} from './__mocks__/es_results';
import { singleSearchAfter } from './single_search_after';
import { alertsMock, AlertServicesMock } from '../../../../../alerts/server/mocks';

describe('singleSearchAfter', () => {
  const mockService: AlertServicesMock = alertsMock.createAlertServices();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('if singleSearchAfter works without a given sort id', async () => {
    let searchAfterSortId;
    mockService.callCluster.mockResolvedValue(sampleDocSearchResultsNoSortId);
    const { searchResult } = await singleSearchAfter({
      searchAfterSortId,
      index: [],
      from: 'now-360s',
      to: 'now',
      services: mockService,
      logger: mockLogger,
      pageSize: 1,
      filter: undefined,
    });
    expect(searchResult).toEqual(sampleDocSearchResultsNoSortId);
  });
  test('if singleSearchAfter works with a given sort id', async () => {
    const searchAfterSortId = '1234567891111';
    mockService.callCluster.mockResolvedValue(sampleDocSearchResultsWithSortId);
    const { searchResult } = await singleSearchAfter({
      searchAfterSortId,
      index: [],
      from: 'now-360s',
      to: 'now',
      services: mockService,
      logger: mockLogger,
      pageSize: 1,
      filter: undefined,
    });
    expect(searchResult).toEqual(sampleDocSearchResultsWithSortId);
  });
  test('if singleSearchAfter throws error', async () => {
    const searchAfterSortId = '1234567891111';
    mockService.callCluster.mockImplementation(async () => {
      throw Error('Fake Error');
    });
    await expect(
      singleSearchAfter({
        searchAfterSortId,
        index: [],
        from: 'now-360s',
        to: 'now',
        services: mockService,
        logger: mockLogger,
        pageSize: 1,
        filter: undefined,
      })
    ).rejects.toThrow('Fake Error');
  });
});
