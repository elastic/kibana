/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';
import { elasticsearchServiceMock } from '../../../../../src/core/server/mocks';
import {
  wrapScopedClusterClient,
  ElasticsearchClientWithChild,
} from './wrap_scoped_cluster_client';

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

  test('searches with asInternalUser when specified', async () => {
    const abortController = new AbortController();
    const scopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
    const childClient = elasticsearchServiceMock.createElasticsearchClient();

    (
      scopedClusterClient.asInternalUser as unknown as jest.Mocked<ElasticsearchClientWithChild>
    ).child.mockReturnValue(childClient as unknown as Client);
    const searchFn = childClient.search;

    const wrappedScopedClusterClient = wrapScopedClusterClient({
      scopedClusterClient,
      abortController,
    });

    await wrappedScopedClusterClient.asInternalUser.search(esQuery);
    expect(searchFn).toHaveBeenCalledWith(esQuery, {
      signal: abortController.signal,
    });
    expect(scopedClusterClient.asInternalUser.search).not.toHaveBeenCalled();
    expect(scopedClusterClient.asCurrentUser.search).not.toHaveBeenCalled();
  });

  test('searches with asCurrentUser when specified', async () => {
    const abortController = new AbortController();
    const scopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
    const childClient = elasticsearchServiceMock.createElasticsearchClient();

    (
      scopedClusterClient.asCurrentUser as unknown as jest.Mocked<ElasticsearchClientWithChild>
    ).child.mockReturnValue(childClient as unknown as Client);
    const searchFn = childClient.search;

    const wrappedScopedClusterClient = wrapScopedClusterClient({
      scopedClusterClient,
      abortController,
    });

    await wrappedScopedClusterClient.asCurrentUser.search(esQuery);
    expect(searchFn).toHaveBeenCalledWith(esQuery, {
      signal: abortController.signal,
    });
    expect(scopedClusterClient.asCurrentUser.search).not.toHaveBeenCalled();
    expect(scopedClusterClient.asInternalUser.search).not.toHaveBeenCalled();
  });

  test('uses search options when specified', async () => {
    const abortController = new AbortController();
    const scopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
    const childClient = elasticsearchServiceMock.createElasticsearchClient();

    (
      scopedClusterClient.asInternalUser as unknown as jest.Mocked<ElasticsearchClientWithChild>
    ).child.mockReturnValue(childClient as unknown as Client);
    const searchFn = childClient.search;

    const wrappedScopedClusterClient = wrapScopedClusterClient({
      scopedClusterClient,
      abortController,
    });

    await wrappedScopedClusterClient.asInternalUser.search(esQuery, { ignore: [404] });
    expect(searchFn).toHaveBeenCalledWith(esQuery, {
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

    (
      scopedClusterClient.asInternalUser as unknown as jest.Mocked<ElasticsearchClientWithChild>
    ).child.mockReturnValue(childClient as unknown as Client);
    const searchFn = childClient.search;

    searchFn.mockRejectedValueOnce(new Error('something went wrong!'));
    const wrappedScopedClusterClient = wrapScopedClusterClient({
      scopedClusterClient,
      abortController,
    });

    await expect(
      wrappedScopedClusterClient.asInternalUser.search
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"something went wrong!"`);
  });

  test('throws error when search throws abort error', async () => {
    const abortController = new AbortController();
    abortController.abort();
    const scopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
    const childClient = elasticsearchServiceMock.createElasticsearchClient();

    (
      scopedClusterClient.asInternalUser as unknown as jest.Mocked<ElasticsearchClientWithChild>
    ).child.mockReturnValue(childClient as unknown as Client);
    const searchFn = childClient.search;

    searchFn.mockRejectedValueOnce(new Error('Request has been aborted by the user'));
    const wrappedScopedClusterClient = wrapScopedClusterClient({
      scopedClusterClient,
      abortController,
    });

    await expect(
      wrappedScopedClusterClient.asInternalUser.search
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Search has been aborted due to cancelled execution"`
    );
  });
});
