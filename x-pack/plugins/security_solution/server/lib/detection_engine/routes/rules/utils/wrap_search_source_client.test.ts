/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISearchStartSearchSource } from '@kbn/data-plugin/common';
import { createSearchSourceMock } from '@kbn/data-plugin/common/search/search_source/mocks';
import { of, throwError } from 'rxjs';
import { wrapSearchSourceClient } from './wrap_search_source_client';

const createSearchSourceClientMock = () => {
  const searchSourceMock = createSearchSourceMock();
  searchSourceMock.fetch$ = jest.fn().mockImplementation(() => of({}));

  return {
    searchSourceMock,
    searchSourceClientMock: {
      create: jest.fn().mockReturnValue(searchSourceMock),
      createEmpty: jest.fn().mockReturnValue(searchSourceMock),
    } as unknown as ISearchStartSearchSource,
  };
};

describe('wrapSearchSourceClient', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('searches with provided abort controller', async () => {
    const abortController = new AbortController();
    const { searchSourceMock, searchSourceClientMock } = createSearchSourceClientMock();

    const wrappedSearchClient = wrapSearchSourceClient({
      searchSourceClient: searchSourceClientMock,
      abortController,
    });
    const wrappedSearchSource = await wrappedSearchClient.createEmpty();
    await wrappedSearchSource.fetch();

    expect(searchSourceMock.fetch$).toHaveBeenCalledWith({
      abortSignal: abortController.signal,
    });
  });

  test('uses search options when specified', async () => {
    const abortController = new AbortController();
    const { searchSourceMock, searchSourceClientMock } = createSearchSourceClientMock();

    const wrappedSearchClient = wrapSearchSourceClient({
      searchSourceClient: searchSourceClientMock,
      abortController,
    });
    const wrappedSearchSource = await wrappedSearchClient.create();
    await wrappedSearchSource.fetch({ isStored: true });

    expect(searchSourceMock.fetch$).toHaveBeenCalledWith({
      isStored: true,
      abortSignal: abortController.signal,
    });
  });

  test('re-throws error when search throws error', async () => {
    const abortController = new AbortController();
    const { searchSourceMock, searchSourceClientMock } = createSearchSourceClientMock();
    searchSourceMock.fetch$ = jest
      .fn()
      .mockReturnValue(throwError(new Error('something went wrong!')));

    const wrappedSearchClient = wrapSearchSourceClient({
      searchSourceClient: searchSourceClientMock,
      abortController,
    });
    const wrappedSearchSource = await wrappedSearchClient.create();
    const fetch = wrappedSearchSource.fetch();

    await expect(fetch).rejects.toThrowErrorMatchingInlineSnapshot('"something went wrong!"');
  });

  test('throws error when search throws abort error', async () => {
    const abortController = new AbortController();
    abortController.abort();
    const { searchSourceMock, searchSourceClientMock } = createSearchSourceClientMock();
    searchSourceMock.fetch$ = jest
      .fn()
      .mockReturnValue(throwError(new Error('Request has been aborted by the user')));

    const wrappedSearchClient = wrapSearchSourceClient({
      searchSourceClient: searchSourceClientMock,
      abortController,
    });
    const wrappedSearchSource = await wrappedSearchClient.create();
    const fetch = wrappedSearchSource.fetch();

    await expect(fetch).rejects.toThrowErrorMatchingInlineSnapshot(
      '"Search has been aborted due to cancelled execution"'
    );
  });
});
