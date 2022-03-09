/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';
import { loggingSystemMock } from 'src/core/server/mocks';
import { elasticsearchServiceMock } from '../../../../../src/core/server/mocks';
import { createWrappedScopedClusterClientFactory } from './wrap_scoped_cluster_client';

const esQuery = {
  body: { query: { bool: { filter: { range: { '@timestamp': { gte: 0 } } } } } },
};

const logger = loggingSystemMock.create().get();

const rule = {
  name: 'test-rule',
  alertTypeId: '.test-rule-type',
  id: 'abcdefg',
  spaceId: 'my-space',
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
    const scopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
    const childClient = elasticsearchServiceMock.createElasticsearchClient();

    scopedClusterClient.asInternalUser.child.mockReturnValue(childClient as unknown as Client);
    const asInternalUserWrappedSearchFn = childClient.search;

    const wrappedSearchClient = createWrappedScopedClusterClientFactory({
      scopedClusterClient,
      rule,
      logger,
    }).client();
    await wrappedSearchClient.asInternalUser.search(esQuery);

    expect(asInternalUserWrappedSearchFn).toHaveBeenCalledWith(esQuery, {});
    expect(scopedClusterClient.asInternalUser.search).not.toHaveBeenCalled();
    expect(scopedClusterClient.asCurrentUser.search).not.toHaveBeenCalled();
  });

  test('searches with asCurrentUser when specified', async () => {
    const scopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
    const childClient = elasticsearchServiceMock.createElasticsearchClient();

    scopedClusterClient.asCurrentUser.child.mockReturnValue(childClient as unknown as Client);
    const asCurrentUserWrappedSearchFn = childClient.search;

    const wrappedSearchClient = createWrappedScopedClusterClientFactory({
      scopedClusterClient,
      rule,
      logger,
    }).client();
    await wrappedSearchClient.asCurrentUser.search(esQuery);

    expect(asCurrentUserWrappedSearchFn).toHaveBeenCalledWith(esQuery, {});
    expect(scopedClusterClient.asInternalUser.search).not.toHaveBeenCalled();
    expect(scopedClusterClient.asCurrentUser.search).not.toHaveBeenCalled();
  });

  test('uses search options when specified', async () => {
    const scopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
    const childClient = elasticsearchServiceMock.createElasticsearchClient();

    scopedClusterClient.asInternalUser.child.mockReturnValue(childClient as unknown as Client);
    const asInternalUserWrappedSearchFn = childClient.search;

    const wrappedSearchClient = createWrappedScopedClusterClientFactory({
      scopedClusterClient,
      rule,
      logger,
    }).client();
    await wrappedSearchClient.asInternalUser.search(esQuery, { ignore: [404] });

    expect(asInternalUserWrappedSearchFn).toHaveBeenCalledWith(esQuery, {
      ignore: [404],
    });
    expect(scopedClusterClient.asInternalUser.search).not.toHaveBeenCalled();
    expect(scopedClusterClient.asCurrentUser.search).not.toHaveBeenCalled();
  });

  test('re-throws error when search throws error', async () => {
    const scopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
    const childClient = elasticsearchServiceMock.createElasticsearchClient();

    scopedClusterClient.asInternalUser.child.mockReturnValue(childClient as unknown as Client);
    const asInternalUserWrappedSearchFn = childClient.search;

    asInternalUserWrappedSearchFn.mockRejectedValueOnce(new Error('something went wrong!'));
    const wrappedSearchClient = createWrappedScopedClusterClientFactory({
      scopedClusterClient,
      rule,
      logger,
    }).client();

    await expect(
      wrappedSearchClient.asInternalUser.search
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"something went wrong!"`);
  });

  test('handles empty search result object', async () => {
    const scopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
    const childClient = elasticsearchServiceMock.createElasticsearchClient();

    scopedClusterClient.asInternalUser.child.mockReturnValue(childClient as unknown as Client);
    const asInternalUserWrappedSearchFn = childClient.search;
    // @ts-ignore incomplete return type
    asInternalUserWrappedSearchFn.mockResolvedValue({});

    const wrappedSearchClientFactory = createWrappedScopedClusterClientFactory({
      scopedClusterClient,
      rule,
      logger,
    });

    const wrappedSearchClient = wrappedSearchClientFactory.client();
    await wrappedSearchClient.asInternalUser.search(esQuery);

    expect(asInternalUserWrappedSearchFn).toHaveBeenCalledTimes(1);
    expect(scopedClusterClient.asInternalUser.search).not.toHaveBeenCalled();
    expect(scopedClusterClient.asCurrentUser.search).not.toHaveBeenCalled();

    const stats = wrappedSearchClientFactory.getMetrics();
    expect(stats.numSearches).toEqual(1);
    expect(stats.esSearchDurationMs).toEqual(0);
  });

  test('keeps track of number of queries', async () => {
    const scopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
    const childClient = elasticsearchServiceMock.createElasticsearchClient();

    scopedClusterClient.asInternalUser.child.mockReturnValue(childClient as unknown as Client);
    const asInternalUserWrappedSearchFn = childClient.search;
    // @ts-ignore incomplete return type
    asInternalUserWrappedSearchFn.mockResolvedValue({ took: 333 });

    const wrappedSearchClientFactory = createWrappedScopedClusterClientFactory({
      scopedClusterClient,
      rule,
      logger,
    });
    const wrappedSearchClient = wrappedSearchClientFactory.client();
    await wrappedSearchClient.asInternalUser.search(esQuery);
    await wrappedSearchClient.asInternalUser.search(esQuery);
    await wrappedSearchClient.asInternalUser.search(esQuery);

    expect(asInternalUserWrappedSearchFn).toHaveBeenCalledTimes(3);
    expect(scopedClusterClient.asInternalUser.search).not.toHaveBeenCalled();
    expect(scopedClusterClient.asCurrentUser.search).not.toHaveBeenCalled();

    const stats = wrappedSearchClientFactory.getMetrics();
    expect(stats.numSearches).toEqual(3);
    expect(stats.esSearchDurationMs).toEqual(999);

    expect(logger.debug).toHaveBeenCalledWith(
      `executing query for rule .test-rule-type:abcdefg in space my-space - {\"body\":{\"query\":{\"bool\":{\"filter\":{\"range\":{\"@timestamp\":{\"gte\":0}}}}}}} - with options {}`
    );
  });
});
