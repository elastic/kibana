/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { createWrappedScopedClusterClientFactory } from './wrap_scoped_cluster_client';

const esQuery = {
  body: { query: { bool: { filter: { range: { '@timestamp': { gte: 0 } } } } } },
};
const eqlQuery = {
  index: 'foo',
  query: 'process where process.name == "regsvr32.exe"',
};
const esqlQueryRequest = {
  method: 'POST',
  path: '/_esql',
  body: {
    query: 'from .kibana_task_manager',
  },
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
    jest.useFakeTimers({ legacyFakeTimers: true });
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('search', () => {
    test('uses asInternalUser when specified', async () => {
      const { abortController, scopedClusterClient, childClient } = getMockClusterClients();

      const asInternalUserWrappedSearchFn = childClient.search;

      const wrappedSearchClient = createWrappedScopedClusterClientFactory({
        scopedClusterClient,
        rule,
        logger,
        abortController,
      }).client();
      await wrappedSearchClient.asInternalUser.search(esQuery);

      expect(asInternalUserWrappedSearchFn).toHaveBeenCalledWith(esQuery, {
        signal: abortController.signal,
      });
      expect(scopedClusterClient.asInternalUser.search).not.toHaveBeenCalled();
      expect(scopedClusterClient.asCurrentUser.search).not.toHaveBeenCalled();
    });

    test('uses asCurrentUser when specified', async () => {
      const { abortController, scopedClusterClient, childClient } = getMockClusterClients(true);

      const asCurrentUserWrappedSearchFn = childClient.search;

      const wrappedSearchClient = createWrappedScopedClusterClientFactory({
        scopedClusterClient,
        rule,
        logger,
        abortController,
      }).client();
      await wrappedSearchClient.asCurrentUser.search(esQuery);

      expect(asCurrentUserWrappedSearchFn).toHaveBeenCalledWith(esQuery, {
        signal: abortController.signal,
      });
      expect(scopedClusterClient.asInternalUser.search).not.toHaveBeenCalled();
      expect(scopedClusterClient.asCurrentUser.search).not.toHaveBeenCalled();
    });

    test('uses search options when specified', async () => {
      const { abortController, scopedClusterClient, childClient } = getMockClusterClients();

      const asInternalUserWrappedSearchFn = childClient.search;

      const wrappedSearchClient = createWrappedScopedClusterClientFactory({
        scopedClusterClient,
        rule,
        logger,
        abortController,
      }).client();
      await wrappedSearchClient.asInternalUser.search(esQuery, { ignore: [404] });

      expect(asInternalUserWrappedSearchFn).toHaveBeenCalledWith(esQuery, {
        ignore: [404],
        signal: abortController.signal,
      });
      expect(scopedClusterClient.asInternalUser.search).not.toHaveBeenCalled();
      expect(scopedClusterClient.asCurrentUser.search).not.toHaveBeenCalled();
    });

    test('re-throws error when an error is thrown', async () => {
      const { abortController, scopedClusterClient, childClient } = getMockClusterClients();

      childClient.search.mockRejectedValueOnce(new Error('something went wrong!'));

      const wrappedSearchClient = createWrappedScopedClusterClientFactory({
        scopedClusterClient,
        rule,
        logger,
        abortController,
      }).client();

      await expect(
        wrappedSearchClient.asInternalUser.search
      ).rejects.toThrowErrorMatchingInlineSnapshot(`"something went wrong!"`);
    });

    test('handles empty search result object', async () => {
      const { abortController, scopedClusterClient, childClient } = getMockClusterClients();

      const asInternalUserWrappedSearchFn = childClient.search;
      // @ts-ignore incomplete return type
      asInternalUserWrappedSearchFn.mockResolvedValue({});

      const wrappedSearchClientFactory = createWrappedScopedClusterClientFactory({
        scopedClusterClient,
        rule,
        logger,
        abortController,
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
      const { abortController, scopedClusterClient, childClient } = getMockClusterClients();

      const asInternalUserWrappedSearchFn = childClient.search;
      // @ts-ignore incomplete return type
      asInternalUserWrappedSearchFn.mockResolvedValue({ took: 333 });

      const wrappedSearchClientFactory = createWrappedScopedClusterClientFactory({
        scopedClusterClient,
        rule,
        logger,
        abortController,
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

    test('throws error when search throws abort error', async () => {
      const { abortController, scopedClusterClient, childClient } = getMockClusterClients();

      abortController.abort();
      childClient.search.mockRejectedValueOnce(new Error('Request has been aborted by the user'));

      const abortableSearchClient = createWrappedScopedClusterClientFactory({
        scopedClusterClient,
        rule,
        logger,
        abortController,
      }).client();

      await expect(
        abortableSearchClient.asInternalUser.search
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Search has been aborted due to cancelled execution"`
      );
    });
  });

  describe('eql.search', () => {
    test('re-throws error when an error is thrown', async () => {
      const { abortController, scopedClusterClient, childClient } = getMockClusterClients();

      childClient.eql.search.mockRejectedValueOnce(new Error('something went wrong!'));

      const wrappedSearchClient = createWrappedScopedClusterClientFactory({
        scopedClusterClient,
        rule,
        logger,
        abortController,
      }).client();

      await expect(
        wrappedSearchClient.asInternalUser.eql.search
      ).rejects.toThrowErrorMatchingInlineSnapshot(`"something went wrong!"`);
    });

    test('keeps track of number of queries', async () => {
      const { abortController, scopedClusterClient, childClient } = getMockClusterClients();

      const asInternalUserWrappedEqlSearchFn = childClient.eql.search;
      // @ts-ignore incomplete return type
      asInternalUserWrappedEqlSearchFn.mockResolvedValue({ took: 333 });

      const wrappedSearchClientFactory = createWrappedScopedClusterClientFactory({
        scopedClusterClient,
        rule,
        logger,
        abortController,
      });
      const wrappedSearchClient = wrappedSearchClientFactory.client();
      await wrappedSearchClient.asInternalUser.eql.search(eqlQuery);
      await wrappedSearchClient.asInternalUser.eql.search(eqlQuery);
      await wrappedSearchClient.asInternalUser.eql.search(eqlQuery);

      expect(asInternalUserWrappedEqlSearchFn).toHaveBeenCalledTimes(3);
      expect(scopedClusterClient.asInternalUser.eql.search).not.toHaveBeenCalled();
      expect(scopedClusterClient.asCurrentUser.eql.search).not.toHaveBeenCalled();

      const stats = wrappedSearchClientFactory.getMetrics();
      expect(stats.numSearches).toEqual(3);
      expect(stats.esSearchDurationMs).toEqual(999);

      expect(logger.debug).toHaveBeenCalledWith(
        `executing eql query for rule .test-rule-type:abcdefg in space my-space - {\"index\":\"foo\",\"query\":\"process where process.name == \\\"regsvr32.exe\\\"\"} - with options {}`
      );
    });

    test('throws error when eql search throws abort error', async () => {
      const { abortController, scopedClusterClient, childClient } = getMockClusterClients();

      abortController.abort();
      childClient.eql.search.mockRejectedValueOnce(
        new Error('Request has been aborted by the user')
      );

      const abortableSearchClient = createWrappedScopedClusterClientFactory({
        scopedClusterClient,
        rule,
        logger,
        abortController,
      }).client();

      await expect(
        abortableSearchClient.asInternalUser.eql.search
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"EQL search has been aborted due to cancelled execution"`
      );
    });
  });

  describe('transport.request', () => {
    describe('ES|QL', () => {
      test('re-throws error when an error is thrown', async () => {
        const { abortController, scopedClusterClient, childClient } = getMockClusterClients();

        childClient.transport.request.mockRejectedValueOnce(new Error('something went wrong!'));

        const wrappedSearchClient = createWrappedScopedClusterClientFactory({
          scopedClusterClient,
          rule,
          logger,
          abortController,
        }).client();

        await expect(
          wrappedSearchClient.asInternalUser.transport.request({ method: 'POST', path: '/_esql' })
        ).rejects.toThrowErrorMatchingInlineSnapshot(`"something went wrong!"`);
      });

      test('keeps track of number of queries', async () => {
        const { abortController, scopedClusterClient, childClient } = getMockClusterClients();

        const asInternalUserWrappedRequestFn = childClient.transport.request;
        // @ts-ignore incomplete return type
        asInternalUserWrappedRequestFn.mockResolvedValue({});

        const wrappedSearchClientFactory = createWrappedScopedClusterClientFactory({
          scopedClusterClient,
          rule,
          logger,
          abortController,
        });
        const wrappedSearchClient = wrappedSearchClientFactory.client();
        await wrappedSearchClient.asInternalUser.transport.request(esqlQueryRequest);
        await wrappedSearchClient.asInternalUser.transport.request(esqlQueryRequest);
        await wrappedSearchClient.asInternalUser.transport.request(esqlQueryRequest);

        expect(asInternalUserWrappedRequestFn).toHaveBeenCalledTimes(3);
        expect(scopedClusterClient.asInternalUser.transport.request).not.toHaveBeenCalled();
        expect(scopedClusterClient.asCurrentUser.transport.request).not.toHaveBeenCalled();

        const stats = wrappedSearchClientFactory.getMetrics();
        expect(stats.numSearches).toEqual(3);
        expect(stats.totalSearchDurationMs).toBeGreaterThan(-1);

        expect(logger.debug).toHaveBeenCalledWith(
          `executing ES|QL query for rule .test-rule-type:abcdefg in space my-space - {\"method\":\"POST\",\"path\":\"/_esql\",\"body\":{\"query\":\"from .kibana_task_manager\"}} - with options {}`
        );
      });

      test('throws error when es|ql search throws abort error', async () => {
        const { abortController, scopedClusterClient, childClient } = getMockClusterClients();

        abortController.abort();
        childClient.transport.request.mockRejectedValueOnce(
          new Error('Request has been aborted by the user')
        );

        const abortableSearchClient = createWrappedScopedClusterClientFactory({
          scopedClusterClient,
          rule,
          logger,
          abortController,
        }).client();

        await expect(
          abortableSearchClient.asInternalUser.transport.request({ method: 'POST', path: '/_esql' })
        ).rejects.toThrowErrorMatchingInlineSnapshot(
          `"ES|QL search has been aborted due to cancelled execution"`
        );
      });
    });

    test('re-throws error when an error is thrown', async () => {
      const { abortController, scopedClusterClient, childClient } = getMockClusterClients();

      childClient.transport.request.mockRejectedValueOnce(new Error('something went wrong!'));

      const wrappedSearchClient = createWrappedScopedClusterClientFactory({
        scopedClusterClient,
        rule,
        logger,
        abortController,
      }).client();

      await expect(
        wrappedSearchClient.asInternalUser.transport.request({ method: '', path: '' })
      ).rejects.toThrowErrorMatchingInlineSnapshot(`"something went wrong!"`);
    });

    test(`doesn't throw error when non es|ql request throws an error`, async () => {
      const { abortController, scopedClusterClient, childClient } = getMockClusterClients();

      abortController.abort();
      childClient.transport.request.mockRejectedValueOnce(new Error('Some other error'));

      const abortableSearchClient = createWrappedScopedClusterClientFactory({
        scopedClusterClient,
        rule,
        logger,
        abortController,
      }).client();

      await expect(
        abortableSearchClient.asInternalUser.transport.request({
          method: 'GET',
          path: '/_cat/indices',
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(`"Some other error"`);
    });
  });
});

function getMockClusterClients(asCurrentUser: boolean = false) {
  const abortController = new AbortController();
  const scopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
  const childClient = elasticsearchServiceMock.createElasticsearchClient();

  if (asCurrentUser) {
    scopedClusterClient.asCurrentUser.child.mockReturnValue(childClient as unknown as Client);
  } else {
    scopedClusterClient.asInternalUser.child.mockReturnValue(childClient as unknown as Client);
  }

  return { abortController, scopedClusterClient, childClient };
}
