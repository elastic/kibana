/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { wrapScopedClusterClient } from './wrap_scoped_cluster_client';

const esQuery = {
  body: { query: { bool: { filter: { range: { '@timestamp': { gte: 0 } } } } } },
};

describe('wrapScopedClusterClient', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('searches with asInternalUser when specified', async () => {
    const abortController = new AbortController();
    const scopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
    const childClient = elasticsearchServiceMock.createElasticsearchClient();

    scopedClusterClient.asInternalUser.child.mockReturnValue(childClient as unknown as Client);
    const asInternalUserWrappedSearchFn = childClient.search;

    const wrappedSearchClient = wrapScopedClusterClient({
      scopedClusterClient,
      abortController,
    });
    await wrappedSearchClient.asInternalUser.search(esQuery);

    expect(asInternalUserWrappedSearchFn).toHaveBeenCalledWith(esQuery, {
      signal: abortController.signal,
    });
    expect(scopedClusterClient.asInternalUser.search).not.toHaveBeenCalled();
    expect(scopedClusterClient.asCurrentUser.search).not.toHaveBeenCalled();
  });

  test('searches with asCurrentUser when specified', async () => {
    const abortController = new AbortController();
    const scopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
    const childClient = elasticsearchServiceMock.createElasticsearchClient();

    scopedClusterClient.asCurrentUser.child.mockReturnValue(childClient as unknown as Client);
    const asCurrentUserWrappedSearchFn = childClient.search;

    const wrappedSearchClient = wrapScopedClusterClient({
      scopedClusterClient,
      abortController,
    });
    await wrappedSearchClient.asCurrentUser.search(esQuery);

    expect(asCurrentUserWrappedSearchFn).toHaveBeenCalledWith(esQuery, {
      signal: abortController.signal,
    });
    expect(scopedClusterClient.asInternalUser.search).not.toHaveBeenCalled();
    expect(scopedClusterClient.asCurrentUser.search).not.toHaveBeenCalled();
  });

  test('uses search options when specified', async () => {
    const abortController = new AbortController();
    const scopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
    const childClient = elasticsearchServiceMock.createElasticsearchClient();

    scopedClusterClient.asInternalUser.child.mockReturnValue(childClient as unknown as Client);
    const asInternalUserWrappedSearchFn = childClient.search;

    const wrappedSearchClient = wrapScopedClusterClient({
      scopedClusterClient,
      abortController,
    });
    await wrappedSearchClient.asInternalUser.search(esQuery, { ignore: [404] });

    expect(asInternalUserWrappedSearchFn).toHaveBeenCalledWith(esQuery, {
      ignore: [404],
      signal: abortController.signal,
    });
    expect(scopedClusterClient.asInternalUser.search).not.toHaveBeenCalled();
    expect(scopedClusterClient.asCurrentUser.search).not.toHaveBeenCalled();
  });

  test('re-throws error when search throws error', async () => {
    const abortController = new AbortController();
    const scopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
    const childClient = elasticsearchServiceMock.createElasticsearchClient();

    scopedClusterClient.asInternalUser.child.mockReturnValue(childClient as unknown as Client);
    const asInternalUserWrappedSearchFn = childClient.search;

    asInternalUserWrappedSearchFn.mockRejectedValueOnce(new Error('something went wrong!'));
    const wrappedSearchClient = wrapScopedClusterClient({
      scopedClusterClient,
      abortController,
    });

    await expect(
      wrappedSearchClient.asInternalUser.search
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"something went wrong!"`);
  });

  test('handles empty search result object', async () => {
    const abortController = new AbortController();
    const scopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
    const childClient = elasticsearchServiceMock.createElasticsearchClient();

    scopedClusterClient.asInternalUser.child.mockReturnValue(childClient as unknown as Client);
    const asInternalUserWrappedSearchFn = childClient.search;
    // @ts-ignore incomplete return type
    asInternalUserWrappedSearchFn.mockResolvedValue({});

    const wrappedSearchClient = wrapScopedClusterClient({
      scopedClusterClient,
      abortController,
    });

    await wrappedSearchClient.asInternalUser.search(esQuery);

    expect(asInternalUserWrappedSearchFn).toHaveBeenCalledTimes(1);
    expect(scopedClusterClient.asInternalUser.search).not.toHaveBeenCalled();
    expect(scopedClusterClient.asCurrentUser.search).not.toHaveBeenCalled();
  });

  test('throws error when search throws abort error', async () => {
    const abortController = new AbortController();
    abortController.abort();
    const scopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
    const childClient = elasticsearchServiceMock.createElasticsearchClient();

    scopedClusterClient.asInternalUser.child.mockReturnValue(childClient as unknown as Client);
    childClient.search.mockRejectedValueOnce(new Error('Request has been aborted by the user'));

    const abortableSearchClient = wrapScopedClusterClient({
      scopedClusterClient,
      abortController,
    });

    await expect(
      abortableSearchClient.asInternalUser.search
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Search has been aborted due to cancelled execution"`
    );
  });
});
