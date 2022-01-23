/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import isEqual from 'lodash/isEqual';
import { elasticsearchServiceMock } from 'src/core/server/mocks';
import { createPercolatorQueries } from './create_percolator_queries';
import { createPercolateQueries } from './create_percolate_queries';
import { DETECTION_ENGINE_MAX_PER_PAGE } from '../../../../../../common/constants';
import { getNextPage } from '../../../signals/threat_mapping/get_next_page';
import { emptySearchResult, searchResultOneEvent } from './mocks';

jest.mock('../../../signals/threat_mapping/get_next_page');
jest.mock('./create_percolate_queries');

const getNextPageMock = getNextPage as jest.Mock;
getNextPageMock.mockResolvedValue(emptySearchResult.searchResult);

const createPercolateQueriesMock = createPercolateQueries as jest.Mock;
createPercolateQueriesMock.mockResolvedValue([]);

describe('createPercolatorQueries', () => {
  const abortableEsClient = elasticsearchServiceMock.createElasticsearchClient();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('makes the expected requests', () => {
    createPercolatorQueries({
      abortableEsClient,
      exceptionItems: [],
      logDebugMessage: jest.fn(),
      perPage: DETECTION_ENGINE_MAX_PER_PAGE,
      ruleId: 'abcd-efgh-jkli-mnop',
      ruleVersion: 2,
      searchAfter: ['5555'],
      threatFilters: [{ mockFilter: true }],
      threatIndex: ['threat-index'],
      threatLanguage: 'kuery',
      threatMapping: [
        { entries: [{ field: 'mockThreatField', value: 'mockValue', type: 'mapping' }] },
      ],
      threatQuery: 'timestamp > now-30m',
      timestampOverride: 'event.ingested',
    });

    expect(getNextPageMock.mock.calls.length).toEqual(1);

    // removing mocks to prevent `Received: serializes to the same string` error
    const actualGetNextPageArgs = getNextPageMock.mock.calls[0][0];
    delete actualGetNextPageArgs.abortableEsClient;
    delete actualGetNextPageArgs.logDebugMessage;

    // testing transformHits separately below due to `Received: serializes to the same string` error
    delete actualGetNextPageArgs.transformHits;

    const expectedGetNextPageArgs = {
      exceptionItems: [],
      filters: [{ mockFilter: true }],
      index: ['threat-index'],
      language: 'kuery',
      perPage: 10000,
      query: 'timestamp > now-30m',
      searchAfter: ['5555'],
      sortOrder: 'asc',
      timestampOverride: 'event.ingested',
    };

    expect(isEqual(expectedGetNextPageArgs, actualGetNextPageArgs)).toBe(true);
  });

  it('transforms hits as expected', async () => {
    getNextPageMock.mockResolvedValueOnce(searchResultOneEvent.searchResult);

    await createPercolatorQueries({
      abortableEsClient,
      exceptionItems: [],
      logDebugMessage: jest.fn(),
      perPage: DETECTION_ENGINE_MAX_PER_PAGE,
      ruleId: 'abcd-efgh-jkli-mnop',
      ruleVersion: 2,
      searchAfter: ['5555'],
      threatFilters: [{ mockFilter: true }],
      threatIndex: ['threat-index'],
      threatLanguage: 'kuery',
      threatMapping: [
        { entries: [{ field: 'mockThreatField', value: 'mockValue', type: 'mapping' }] },
      ],
      threatQuery: 'timestamp > now-30m',
      timestampOverride: 'event.ingested',
    });

    const createPercolateQueriesArgs = createPercolateQueriesMock.mock.calls[0][0];
    const expectedArgs = {
      ruleId: 'abcd-efgh-jkli-mnop',
      ruleVersion: 2,
      threatList: [
        {
          _id: '1111',
          _index: 'event-index',
          _source: { event: { category: 'fake' }, file: { hash: { sha1: 'asdf' } } },
          sort: ['333'],
        },
      ],
      threatMapping: [
        { entries: [{ field: 'mockThreatField', value: 'mockValue', type: 'mapping' }] },
      ],
    };

    expect(isEqual(createPercolateQueriesArgs, expectedArgs)).toBe(true);
  });
});
