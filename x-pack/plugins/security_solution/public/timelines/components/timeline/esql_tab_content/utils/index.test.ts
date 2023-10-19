/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSearchSourceMock } from '@kbn/data-plugin/public/mocks';
import { buildDataViewMock, shallowMockedFields } from '@kbn/discover-utils/src/__mocks__';
import { savedSearchComparator } from '.';

const customQuery = {
  language: 'kuery',
  query: '_id: *',
};

const firstDataViewMock = buildDataViewMock({
  name: 'first-data-view',
  fields: shallowMockedFields,
});

const secondDataViewMock = buildDataViewMock({
  name: 'second-data-view',
  fields: shallowMockedFields,
});

describe('savedSearchComparator', () => {
  const firstMockSavedSearch = {
    id: 'first',
    title: 'first title',
    breakdownField: 'firstBreakdown Field',
    searchSource: createSearchSourceMock({
      index: firstDataViewMock,
      query: customQuery,
    }),
  };

  const secondMockSavedSearch = {
    id: 'second',
    title: 'second title',
    breakdownField: 'second Breakdown Field',
    searchSource: createSearchSourceMock({
      index: secondDataViewMock,
      query: customQuery,
    }),
  };
  it('should result true when saved search is same', () => {
    const result = savedSearchComparator(firstMockSavedSearch, { ...firstMockSavedSearch });
    expect(result).toBe(true);
  });

  it('should return false index is different', () => {
    const newMockedSavedSearch = {
      ...firstMockSavedSearch,
      searchSource: secondMockSavedSearch.searchSource,
    };

    const result = savedSearchComparator(firstMockSavedSearch, newMockedSavedSearch);

    expect(result).toBe(false);
  });

  it('should return false when query is different', () => {
    const newMockedSavedSearch = {
      ...firstMockSavedSearch,
      searchSource: createSearchSourceMock({
        index: firstDataViewMock,
        query: {
          ...customQuery,
          query: '*',
        },
      }),
    };

    const result = savedSearchComparator(firstMockSavedSearch, newMockedSavedSearch);

    expect(result).toBe(false);
  });

  it('should result false when title is different', () => {
    const newMockedSavedSearch = {
      ...firstMockSavedSearch,
      title: 'new-title',
    };
    const result = savedSearchComparator(firstMockSavedSearch, newMockedSavedSearch);

    expect(result).toBe(false);
  });
});
