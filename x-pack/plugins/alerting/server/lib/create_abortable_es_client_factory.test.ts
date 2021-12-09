/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '../../../../../src/core/server/mocks';
import { createAbortableEsClientFactory } from './create_abortable_es_client_factory';

const esQuery = {
  body: { query: { bool: { filter: { range: { '@timestamp': { gte: 0 } } } } } },
};

describe('createAbortableEsClientFactory', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  test('searches with asInternalUser when specified', async () => {
    const abortController = new AbortController();
    const scopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
    const abortableSearchClient = createAbortableEsClientFactory({
      scopedClusterClient,
      abortController,
    });

    await abortableSearchClient.asInternalUser.search(esQuery);
    expect(scopedClusterClient.asInternalUser.search).toHaveBeenCalledWith(esQuery, {
      signal: abortController.signal,
    });
    expect(scopedClusterClient.asCurrentUser.search).not.toHaveBeenCalled();
  });

  test('searches with asCurrentUser when specified', async () => {
    const abortController = new AbortController();
    const scopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
    const abortableSearchClient = createAbortableEsClientFactory({
      scopedClusterClient,
      abortController,
    });

    await abortableSearchClient.asCurrentUser.search(esQuery);
    expect(scopedClusterClient.asCurrentUser.search).toHaveBeenCalledWith(esQuery, {
      signal: abortController.signal,
    });
    expect(scopedClusterClient.asInternalUser.search).not.toHaveBeenCalled();
  });

  test('uses search options when specified', async () => {
    const abortController = new AbortController();
    const scopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
    const abortableSearchClient = createAbortableEsClientFactory({
      scopedClusterClient,
      abortController,
    });

    await abortableSearchClient.asInternalUser.search(esQuery, { ignore: [404] });
    expect(scopedClusterClient.asInternalUser.search).toHaveBeenCalledWith(esQuery, {
      ignore: [404],
      signal: abortController.signal,
    });
    expect(scopedClusterClient.asCurrentUser.search).not.toHaveBeenCalled();
  });

  test('re-throws error when search throws error', async () => {
    const abortController = new AbortController();
    const scopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
    scopedClusterClient.asInternalUser.search.mockRejectedValueOnce(
      new Error('something went wrong!')
    );
    const abortableSearchClient = createAbortableEsClientFactory({
      scopedClusterClient,
      abortController,
    });

    await expect(
      abortableSearchClient.asInternalUser.search
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"something went wrong!"`);
  });

  test('throws error when search throws abort error', async () => {
    const abortController = new AbortController();
    abortController.abort();
    const scopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
    scopedClusterClient.asInternalUser.search.mockRejectedValueOnce(
      new Error('Request has been aborted by the user')
    );
    const abortableSearchClient = createAbortableEsClientFactory({
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
