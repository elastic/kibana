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
import { ShardError } from '../../types';
import { buildRuleMessageFactory } from './rule_messages';

const buildRuleMessage = buildRuleMessageFactory({
  id: 'fake id',
  ruleId: 'fake rule id',
  index: 'fakeindex',
  name: 'fake name',
});
describe('singleSearchAfter', () => {
  const mockService: AlertServicesMock = alertsMock.createAlertServices();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('if singleSearchAfter works without a given sort id', async () => {
    mockService.callCluster.mockResolvedValue(sampleDocSearchResultsNoSortId());
    const { searchResult } = await singleSearchAfter({
      searchAfterSortId: undefined,
      index: [],
      from: 'now-360s',
      to: 'now',
      services: mockService,
      logger: mockLogger,
      pageSize: 1,
      filter: undefined,
      timestampOverride: undefined,
      buildRuleMessage,
    });
    expect(searchResult).toEqual(sampleDocSearchResultsNoSortId());
  });
  test('if singleSearchAfter returns an empty failure array', async () => {
    mockService.callCluster.mockResolvedValue(sampleDocSearchResultsNoSortId());
    const { searchErrors } = await singleSearchAfter({
      searchAfterSortId: undefined,
      index: [],
      from: 'now-360s',
      to: 'now',
      services: mockService,
      logger: mockLogger,
      pageSize: 1,
      filter: undefined,
      timestampOverride: undefined,
      buildRuleMessage,
    });
    expect(searchErrors).toEqual([]);
  });
  test('if singleSearchAfter will return an error array', async () => {
    const errors: ShardError[] = [
      {
        shard: 1,
        index: 'index-123',
        node: 'node-123',
        reason: {
          type: 'some type',
          reason: 'some reason',
          index_uuid: 'uuid-123',
          index: 'index-123',
          caused_by: {
            type: 'some type',
            reason: 'some reason',
          },
        },
      },
    ];
    mockService.callCluster.mockResolvedValue({
      took: 10,
      timed_out: false,
      _shards: {
        total: 10,
        successful: 10,
        failed: 1,
        skipped: 0,
        failures: errors,
      },
      hits: {
        total: 100,
        max_score: 100,
        hits: [],
      },
    });
    const { searchErrors } = await singleSearchAfter({
      searchAfterSortId: undefined,
      index: [],
      from: 'now-360s',
      to: 'now',
      services: mockService,
      logger: mockLogger,
      pageSize: 1,
      filter: undefined,
      timestampOverride: undefined,
      buildRuleMessage,
    });
    expect(searchErrors).toEqual([
      'reason: "some reason" type: "some type" caused by reason: "some reason" caused by type: "some type"',
    ]);
  });
  test('if singleSearchAfter works with a given sort id', async () => {
    const searchAfterSortId = '1234567891111';
    mockService.callCluster.mockResolvedValue(sampleDocSearchResultsWithSortId());
    const { searchResult } = await singleSearchAfter({
      searchAfterSortId,
      index: [],
      from: 'now-360s',
      to: 'now',
      services: mockService,
      logger: mockLogger,
      pageSize: 1,
      filter: undefined,
      timestampOverride: undefined,
      buildRuleMessage,
    });
    expect(searchResult).toEqual(sampleDocSearchResultsWithSortId());
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
        timestampOverride: undefined,
        buildRuleMessage,
      })
    ).rejects.toThrow('Fake Error');
  });
});
