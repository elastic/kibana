/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '../../../../../src/core/server/mocks';
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

  test('searches with asInternalUser when specified', async () => {
    const scopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
    const wrappedSearchClient = wrapScopedClusterClient({ scopedClusterClient });

    await wrappedSearchClient.asInternalUser.search(esQuery);
    expect(scopedClusterClient.asInternalUser.search).toHaveBeenCalledWith(esQuery, {});
    expect(scopedClusterClient.asCurrentUser.search).not.toHaveBeenCalled();
  });

  test('searches with asCurrentUser when specified', async () => {
    const scopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
    const wrappedSearchClient = wrapScopedClusterClient({ scopedClusterClient });

    await wrappedSearchClient.asCurrentUser.search(esQuery);
    expect(scopedClusterClient.asCurrentUser.search).toHaveBeenCalledWith(esQuery, {});
    expect(scopedClusterClient.asInternalUser.search).not.toHaveBeenCalled();
  });

  test('uses search options when specified', async () => {
    const scopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
    const wrappedSearchClient = wrapScopedClusterClient({ scopedClusterClient });

    await wrappedSearchClient.asInternalUser.search(esQuery, { ignore: [404] });
    expect(scopedClusterClient.asInternalUser.search).toHaveBeenCalledWith(esQuery, {
      ignore: [404],
    });
    expect(scopedClusterClient.asCurrentUser.search).not.toHaveBeenCalled();
  });

  test('re-throws error when search throws error', async () => {
    const scopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
    scopedClusterClient.asInternalUser.search.mockRejectedValueOnce(
      new Error('something went wrong!')
    );
    const wrappedSearchClient = wrapScopedClusterClient({ scopedClusterClient });

    await expect(
      wrappedSearchClient.asInternalUser.search
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"something went wrong!"`);
  });
});
