/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockHttpValues } from '../../../__mocks__/kea_logic';

import { nextTick } from '@kbn/test-jest-helpers';

import { itShowsServerErrorAsFlashMessage } from '../../../test_helpers';

import { recursivelyFetchEngines } from '.';

describe('recursivelyFetchEngines', () => {
  const { http } = mockHttpValues;

  const MOCK_PAGE_1 = {
    meta: {
      page: { current: 1, total_pages: 3 },
    },
    results: [{ name: 'source-engine-1' }],
  };
  const MOCK_PAGE_2 = {
    meta: {
      page: { current: 2, total_pages: 3 },
    },
    results: [{ name: 'source-engine-2' }],
  };
  const MOCK_PAGE_3 = {
    meta: {
      page: { current: 3, total_pages: 3 },
    },
    results: [{ name: 'source-engine-3' }],
  };
  const MOCK_CALLBACK = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('recursively calls the passed API endpoint and returns all engines to the onComplete callback', async () => {
    http.get
      .mockReturnValueOnce(Promise.resolve(MOCK_PAGE_1))
      .mockReturnValueOnce(Promise.resolve(MOCK_PAGE_2))
      .mockReturnValueOnce(Promise.resolve(MOCK_PAGE_3));

    recursivelyFetchEngines({
      endpoint: '/internal/app_search/engines/some-engine/source_engines',
      onComplete: MOCK_CALLBACK,
    });
    await nextTick();

    expect(http.get).toHaveBeenCalledTimes(3); // Called once for each page
    expect(http.get).toHaveBeenCalledWith(
      '/internal/app_search/engines/some-engine/source_engines',
      {
        query: {
          'page[current]': 1,
          'page[size]': 25,
        },
      }
    );

    expect(MOCK_CALLBACK).toHaveBeenCalledWith([
      { name: 'source-engine-1' },
      { name: 'source-engine-2' },
      { name: 'source-engine-3' },
    ]);
  });

  it('passes optional query params', () => {
    recursivelyFetchEngines({
      endpoint: '/internal/app_search/engines/some-engine/engines',
      onComplete: MOCK_CALLBACK,
      query: { type: 'indexed' },
    });

    expect(http.get).toHaveBeenCalledWith('/internal/app_search/engines/some-engine/engines', {
      query: {
        'page[current]': 1,
        'page[size]': 25,
        type: 'indexed',
      },
    });
  });

  it('passes optional custom page sizes', () => {
    recursivelyFetchEngines({
      endpoint: '/over_9000',
      onComplete: MOCK_CALLBACK,
      pageSize: 9001,
    });

    expect(http.get).toHaveBeenCalledWith('/over_9000', {
      query: {
        'page[current]': 1,
        'page[size]': 9001,
      },
    });
  });

  itShowsServerErrorAsFlashMessage(http.get, () => {
    recursivelyFetchEngines({ endpoint: '/error', onComplete: MOCK_CALLBACK });
  });
});
