/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import moment from 'moment';
import { singleSearchAfter } from '../../../signals/single_search_after';
import { getFilter } from '../../../signals/get_filter';
import { filterEventsAgainstList } from '../../../signals/filters/filter_events_against_list';
import { findPercolateEnrichEvents } from './find_percolate_enrich_events';
import { getListClientMock } from '../../../../../../../lists/server/services/lists/list_client.mock';
import { mockLogger } from '../../../signals/__mocks__/es_results';
import { alertsMock } from '../../../../../../../alerting/server/mocks';
import {
  emptySearchResult,
  mockPercolatorRuleDataClient,
  mockRuleId,
  mockRuleVersion,
  mockSpaceId,
} from './mocks';

jest.mock('../../../signals/single_search_after');
jest.mock('../../../signals/get_filter');
jest.mock('../../../signals/filters/filter_events_against_list');

const singleSearchAfterMock = singleSearchAfter as jest.Mock;
singleSearchAfterMock.mockResolvedValue(emptySearchResult);

const getFilterMock = getFilter as jest.Mock;
getFilterMock.mockResolvedValue({
  bool: {
    must: [],
    filter: [],
    should: [],
    must_not: [],
  },
});

const filterEventsAgainstListMock = filterEventsAgainstList as jest.Mock;
filterEventsAgainstListMock.mockResolvedValue(emptySearchResult.searchResult);

describe('findPercolateEnrichEvents', () => {
  const buildRuleMessage = jest.fn();
  const listClient = getListClientMock();
  const logger = mockLogger;
  const services = alertsMock.createRuleExecutorServices();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('makes the expected getFilter request', async () => {
    await findPercolateEnrichEvents({
      buildRuleMessage,
      exceptionsList: [],
      filters: [],
      index: ['test-index'],
      language: 'kuery',
      listClient,
      logger,
      perPage: 10000,
      query: '*:*',
      services,
      timestampOverride: 'event.ingested',
      tuple: { to: moment('2022-01-14'), from: moment('2022-01-13'), maxSignals: 1337 },
      ruleId: mockRuleId,
      ruleVersion: mockRuleVersion,
      spaceId: mockSpaceId,
      percolatorRuleDataClient: mockPercolatorRuleDataClient,
    });

    expect(getFilterMock.mock.calls[0][0]).toEqual({
      type: 'threat_match',
      filters: [],
      language: 'kuery',
      query: '*:*',
      services,
      index: ['test-index'],
      lists: [],
      savedId: undefined,
    });
  });

  it('makes the expected singleSearchAfter request', async () => {
    await findPercolateEnrichEvents({
      buildRuleMessage,
      exceptionsList: [],
      filters: [],
      index: ['test-index'],
      language: 'kuery',
      listClient,
      logger,
      perPage: 10000,
      query: '*:*',
      services,
      timestampOverride: 'event.ingested',
      tuple: { to: moment('2022-01-14'), from: moment('2022-01-13'), maxSignals: 1337 },
      ruleId: mockRuleId,
      ruleVersion: mockRuleVersion,
      spaceId: mockSpaceId,
      percolatorRuleDataClient: mockPercolatorRuleDataClient,
    });

    expect(singleSearchAfterMock.mock.calls[0][0]).toEqual({
      buildRuleMessage,
      filter: {
        bool: {
          must: [],
          filter: [],
          should: [],
          must_not: [],
        },
      },
      from: moment('2022-01-13').toISOString(),
      index: ['test-index'],
      logger,
      pageSize: 10000,
      searchAfterSortIds: [],
      services,
      sortOrder: undefined,
      timestampOverride: 'event.ingested',
      to: moment('2022-01-14').toISOString(),
      trackTotalHits: false,
    });
  });

  it('returns errors if there are any', async () => {
    singleSearchAfterMock.mockResolvedValueOnce({
      searchResult: {
        took: 0,
        timed_out: false,
        _shards: {
          total: 1,
          successful: 1,
          failed: 0,
          skipped: 0,
        },
        hits: {
          total: 0,
          max_score: 0,
          hits: [],
        },
      },
      searchDuration: '0',
      searchErrors: ['THIS IS AN ERROR'],
    });

    const { errors, success } = await findPercolateEnrichEvents({
      buildRuleMessage,
      exceptionsList: [],
      filters: [],
      index: ['test-index'],
      language: 'kuery',
      listClient,
      logger,
      perPage: 10000,
      query: '*:*',
      services,
      timestampOverride: 'event.ingested',
      tuple: { to: moment('2022-01-14'), from: moment('2022-01-13'), maxSignals: 1337 },
      ruleId: mockRuleId,
      ruleVersion: mockRuleVersion,
      spaceId: mockSpaceId,
      percolatorRuleDataClient: mockPercolatorRuleDataClient,
    });

    expect(errors[0]).toEqual('THIS IS AN ERROR');
    expect(success).toEqual(false);
  });

  it('iterates until there are no results', async () => {
    singleSearchAfterMock.mockResolvedValueOnce({
      searchResult: {
        took: 0,
        timed_out: false,
        _shards: {
          total: 1,
          successful: 1,
          failed: 0,
          skipped: 0,
        },
        hits: {
          total: 0,
          max_score: 0,
          hits: [{ sort: ['13371337'] }],
        },
      },
      searchDuration: '0',
      searchErrors: [],
    });

    filterEventsAgainstListMock.mockResolvedValueOnce({
      took: 0,
      timed_out: false,
      _shards: {
        total: 1,
        successful: 1,
        failed: 0,
        skipped: 0,
      },
      hits: {
        total: 0,
        max_score: 0,
        hits: [{ sort: ['13371337'] }],
      },
    });

    mockPercolatorRuleDataClient
      .getReader({ namespace: mockSpaceId })
      .search.mockResolvedValueOnce({
        took: 0,
        timed_out: false,
        _shards: {
          total: 1,
          successful: 1,
          failed: 0,
          skipped: 0,
        },
        hits: {
          max_score: 0,
          // @ts-ignore
          hits: [{ fields: { _percolator_document_slot: [0] }, threat: { enrichments: [] } }],
        },
      });

    const { enrichedHits } = await findPercolateEnrichEvents({
      buildRuleMessage,
      exceptionsList: [],
      filters: [],
      index: ['test-index'],
      language: 'kuery',
      listClient,
      logger,
      perPage: 10000,
      query: '*:*',
      services,
      timestampOverride: 'event.ingested',
      tuple: { to: moment('2022-01-14'), from: moment('2022-01-13'), maxSignals: 1337 },
      ruleId: mockRuleId,
      ruleVersion: mockRuleVersion,
      spaceId: mockSpaceId,
      percolatorRuleDataClient: mockPercolatorRuleDataClient,
    });

    expect(singleSearchAfterMock).toHaveBeenCalledTimes(2);
    expect(singleSearchAfterMock.mock.calls[1][0].searchAfterSortIds).toEqual(['13371337']);
    expect(enrichedHits).toEqual([
      { sort: ['13371337'], _source: { threat: { enrichments: [] } } },
    ]);
  });
});
