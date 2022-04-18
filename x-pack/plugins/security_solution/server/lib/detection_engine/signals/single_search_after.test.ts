/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import {
  sampleDocSearchResultsNoSortId,
  mockLogger,
  sampleDocSearchResultsWithSortId,
} from './__mocks__/es_results';
import { singleSearchAfter } from './single_search_after';
import { alertsMock, RuleExecutorServicesMock } from '@kbn/alerting-plugin/server/mocks';
import { buildRuleMessageFactory } from './rule_messages';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { elasticsearchClientMock } from '@kbn/core/server/elasticsearch/client/mocks';

const buildRuleMessage = buildRuleMessageFactory({
  id: 'fake id',
  ruleId: 'fake rule id',
  index: 'fakeindex',
  name: 'fake name',
});
describe('singleSearchAfter', () => {
  const mockService: RuleExecutorServicesMock = alertsMock.createRuleExecutorServices();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('if singleSearchAfter works without a given sort id', async () => {
    mockService.scopedClusterClient.asCurrentUser.search.mockResolvedValueOnce(
      elasticsearchClientMock.createSuccessTransportRequestPromise(sampleDocSearchResultsNoSortId())
    );
    const { searchResult } = await singleSearchAfter({
      searchAfterSortIds: undefined,
      index: [],
      from: 'now-360s',
      to: 'now',
      services: mockService,
      logger: mockLogger,
      pageSize: 1,
      filter: {},
      timestampOverride: undefined,
      buildRuleMessage,
    });
    expect(searchResult).toEqual(sampleDocSearchResultsNoSortId());
  });
  test('if singleSearchAfter returns an empty failure array', async () => {
    mockService.scopedClusterClient.asCurrentUser.search.mockResolvedValueOnce(
      elasticsearchClientMock.createSuccessTransportRequestPromise(sampleDocSearchResultsNoSortId())
    );
    const { searchErrors } = await singleSearchAfter({
      searchAfterSortIds: undefined,
      index: [],
      from: 'now-360s',
      to: 'now',
      services: mockService,
      logger: mockLogger,
      pageSize: 1,
      filter: {},
      timestampOverride: undefined,
      buildRuleMessage,
    });
    expect(searchErrors).toEqual([]);
  });
  test('if singleSearchAfter will return an error array', async () => {
    const errors: estypes.ShardFailure[] = [
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
    mockService.scopedClusterClient.asCurrentUser.search.mockResolvedValueOnce(
      elasticsearchClientMock.createSuccessTransportRequestPromise({
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
      })
    );
    const { searchErrors } = await singleSearchAfter({
      searchAfterSortIds: undefined,
      index: [],
      from: 'now-360s',
      to: 'now',
      services: mockService,
      logger: mockLogger,
      pageSize: 1,
      filter: {},
      timestampOverride: undefined,
      buildRuleMessage,
    });
    expect(searchErrors).toEqual([
      'index: "index-123" reason: "some reason" type: "some type" caused by reason: "some reason" caused by type: "some type"',
    ]);
  });
  test('if singleSearchAfter works with a given sort id', async () => {
    const searchAfterSortIds = ['1234567891111'];
    mockService.scopedClusterClient.asCurrentUser.search.mockResolvedValueOnce(
      elasticsearchClientMock.createSuccessTransportRequestPromise(
        sampleDocSearchResultsWithSortId()
      )
    );
    const { searchResult } = await singleSearchAfter({
      searchAfterSortIds,
      index: [],
      from: 'now-360s',
      to: 'now',
      services: mockService,
      logger: mockLogger,
      pageSize: 1,
      filter: {},
      timestampOverride: undefined,
      buildRuleMessage,
    });
    expect(searchResult).toEqual(sampleDocSearchResultsWithSortId());
  });
  test('if singleSearchAfter throws error', async () => {
    const searchAfterSortIds = ['1234567891111'];
    mockService.scopedClusterClient.asCurrentUser.search.mockResolvedValueOnce(
      elasticsearchClientMock.createErrorTransportRequestPromise(new Error('Fake Error'))
    );
    await expect(
      singleSearchAfter({
        searchAfterSortIds,
        index: [],
        from: 'now-360s',
        to: 'now',
        services: mockService,
        logger: mockLogger,
        pageSize: 1,
        filter: {},
        timestampOverride: undefined,
        buildRuleMessage,
      })
    ).rejects.toThrow('Fake Error');
  });
});
