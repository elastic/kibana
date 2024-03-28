/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OnlySearchSourceRuleParams } from '../types';
import { createSearchSourceMock } from '@kbn/data-plugin/common/search/search_source/mocks';
import { getInitialSearchSource } from './get_initial_search_source';
import { Comparator } from '../../../../common/comparator_types';
import { ISearchStartSearchSource } from '@kbn/data-plugin/common';

const defaultParams: OnlySearchSourceRuleParams = {
  size: 100,
  timeWindowSize: 5,
  timeWindowUnit: 'm',
  thresholdComparator: Comparator.LT,
  threshold: [0],
  searchConfiguration: {
    query: {
      query: '',
      language: 'kuery',
    },
    index: 'index',
    filter: [],
    fields: ['test-field'],
  },
  searchType: 'searchSource',
  excludeHitsFromPreviousRun: true,
  aggType: 'count',
  groupBy: 'all',
  timeField: 'time',
};

const createSearchSourceClientMock = () => {
  const searchSourceMock = createSearchSourceMock();
  searchSourceMock.fetch$ = jest.fn();

  return {
    searchSourceMock,
    searchSourceClientMock: {
      create: jest.fn().mockReturnValue(searchSourceMock),
      createEmpty: jest.fn().mockReturnValue(searchSourceMock),
    } as unknown as ISearchStartSearchSource,
  };
};

const { searchSourceClientMock } = createSearchSourceClientMock();

describe('fetchSearchSourceQuery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const fakeNow = new Date('2020-02-09T23:15:41.941Z');

  beforeAll(() => {
    jest.clearAllMocks();
    global.Date.now = jest.fn(() => fakeNow.getTime());
  });

  it('it should create search source with fields', async () => {
    await getInitialSearchSource(defaultParams, searchSourceClientMock);
    expect(searchSourceClientMock.create).toHaveBeenCalledWith({
      fields: ['test-field', 'index', 'filter', 'query'],
      filter: [],
      index: 'index',
      query: {
        language: 'kuery',
        query: '',
      },
    });
  });
});
