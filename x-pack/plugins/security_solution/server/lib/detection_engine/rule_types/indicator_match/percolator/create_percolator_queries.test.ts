/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import isEqual from 'lodash/isEqual';
import { elasticsearchServiceMock } from 'src/core/server/mocks';
import { createPercolatorQueries } from './create_percolator_queries';
import { createThreatQueries } from './create_threat_queries';
import { DETECTION_ENGINE_MAX_PER_PAGE } from '../../../../../../common/constants';
import { getNextPage } from '../../../signals/threat_mapping/get_next_page';
import { emptySearchResult, searchResultOneEvent } from './mocks';

jest.mock('../../../signals/threat_mapping/get_next_page');
jest.mock('./create_threat_queries');

const getNextPageMock = getNextPage as jest.Mock;
getNextPageMock.mockResolvedValue(emptySearchResult.searchResult);

const createThreatQueriesMock = createThreatQueries as jest.Mock;
createThreatQueriesMock.mockResolvedValue([]);

describe('createPercolatorQueries', () => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('makes the expected requests', () => {
    createPercolatorQueries({
      esClient,
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
      threatIndicatorPath: 'threat.indicator',
    });

    expect(getNextPageMock.mock.calls.length).toEqual(1);

    // removing mocks to prevent `Received: serializes to the same string` error
    const actualGetNextPageArgs = getNextPageMock.mock.calls[0][0];
    delete actualGetNextPageArgs.esClient;
    delete actualGetNextPageArgs.logDebugMessage;

    const expectedGetNextPageArgs = {
      exceptionItems: [],
      filters: [{ mockFilter: true }],
      index: ['threat-index'],
      language: 'kuery',
      perPage: 10000,
      query: 'timestamp > now-30m',
      searchAfter: ['5555'],
      threatListConfig: {
        _source: ['threat.indicator.*', 'threat.feed.name'],
        fields: ['mockValue'],
        sort: [{ '@timestamp': 'asc' }],
      },
    };

    expect(isEqual(expectedGetNextPageArgs, actualGetNextPageArgs)).toBe(true);
  });

  it('creates threat queries as expected', async () => {
    getNextPageMock.mockResolvedValueOnce(searchResultOneEvent.searchResult);

    await createPercolatorQueries({
      esClient,
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
      threatIndicatorPath: 'threat.indicator',
    });

    const createThreatQueriesArgs = createThreatQueriesMock.mock.calls[0][0];

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
      threatIndicatorPath: 'threat.indicator',
    };
    expect(isEqual(createThreatQueriesArgs, expectedArgs)).toBe(true);
  });
});
