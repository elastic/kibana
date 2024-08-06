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
  path: '/_query',
  body: {
    query: 'from .kibana_task_manager',
  },
};

let logger = loggingSystemMock.create().get();

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

  beforeEach(() => {
    logger = loggingSystemMock.create().get();
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
        requestTimeout: 5000,
      }).client();
      await wrappedSearchClient.asInternalUser.search(esQuery);

      expect(asInternalUserWrappedSearchFn).toHaveBeenCalledWith(esQuery, {
        signal: abortController.signal,
        requestTimeout: 5000,
      });
      expect(scopedClusterClient.asInternalUser.search).not.toHaveBeenCalled();
      expect(scopedClusterClient.asCurrentUser.search).not.toHaveBeenCalled();
      expect(loggingSystemMock.collect(logger).debug[0][0]).toEqual(
        `executing query for rule .test-rule-type:abcdefg in space my-space - {\"body\":{\"query\":{\"bool\":{\"filter\":{\"range\":{\"@timestamp\":{\"gte\":0}}}}}}} - with options {} and 5000ms requestTimeout`
      );
      expect(logger.warn).not.toHaveBeenCalled();
    });

    test('uses asCurrentUser when specified', async () => {
      const { abortController, scopedClusterClient, childClient } = getMockClusterClients(true);

      const asCurrentUserWrappedSearchFn = childClient.search;

      const wrappedSearchClient = createWrappedScopedClusterClientFactory({
        scopedClusterClient,
        rule,
        logger,
        abortController,
        requestTimeout: 5000,
      }).client();
      await wrappedSearchClient.asCurrentUser.search(esQuery);

      expect(asCurrentUserWrappedSearchFn).toHaveBeenCalledWith(esQuery, {
        signal: abortController.signal,
        requestTimeout: 5000,
      });
      expect(scopedClusterClient.asInternalUser.search).not.toHaveBeenCalled();
      expect(scopedClusterClient.asCurrentUser.search).not.toHaveBeenCalled();
      expect(loggingSystemMock.collect(logger).debug[0][0]).toEqual(
        `executing query for rule .test-rule-type:abcdefg in space my-space - {\"body\":{\"query\":{\"bool\":{\"filter\":{\"range\":{\"@timestamp\":{\"gte\":0}}}}}}} - with options {} and 5000ms requestTimeout`
      );
      expect(logger.warn).not.toHaveBeenCalled();
    });

    test('uses search options when specified', async () => {
      const { abortController, scopedClusterClient, childClient } = getMockClusterClients();

      const asInternalUserWrappedSearchFn = childClient.search;

      const wrappedSearchClient = createWrappedScopedClusterClientFactory({
        scopedClusterClient,
        rule,
        logger,
        abortController,
        requestTimeout: 5000,
      }).client();
      await wrappedSearchClient.asInternalUser.search(esQuery, {
        ignore: [404],
        requestTimeout: 10000,
      });

      expect(asInternalUserWrappedSearchFn).toHaveBeenCalledWith(esQuery, {
        ignore: [404],
        signal: abortController.signal,
        requestTimeout: 5000,
      });
      expect(scopedClusterClient.asInternalUser.search).not.toHaveBeenCalled();
      expect(scopedClusterClient.asCurrentUser.search).not.toHaveBeenCalled();

      expect(loggingSystemMock.collect(logger).debug[0][0]).toEqual(
        `executing query for rule .test-rule-type:abcdefg in space my-space - {\"body\":{\"query\":{\"bool\":{\"filter\":{\"range\":{\"@timestamp\":{\"gte\":0}}}}}}} - with options {\"ignore\":[404],\"requestTimeout\":10000} and 5000ms requestTimeout`
      );
      expect(logger.warn).not.toHaveBeenCalled();
    });

    test('re-throws error and logs query when an error is thrown', async () => {
      const { abortController, scopedClusterClient, childClient } = getMockClusterClients();

      childClient.search.mockRejectedValueOnce(new Error('something went wrong!'));

      const wrappedSearchClient = createWrappedScopedClusterClientFactory({
        scopedClusterClient,
        rule,
        logger,
        abortController,
      }).client();

      await expect(
        wrappedSearchClient.asInternalUser.search(esQuery)
      ).rejects.toThrowErrorMatchingInlineSnapshot(`"something went wrong!"`);

      expect(loggingSystemMock.collect(logger).debug[0][0]).toEqual(
        `executing query for rule .test-rule-type:abcdefg in space my-space - {\"body\":{\"query\":{\"bool\":{\"filter\":{\"range\":{\"@timestamp\":{\"gte\":0}}}}}}} - with options {}`
      );
      expect(logger.warn).toHaveBeenCalledWith(
        `executing query for rule .test-rule-type:abcdefg in space my-space - {\"body\":{\"query\":{\"bool\":{\"filter\":{\"range\":{\"@timestamp\":{\"gte\":0}}}}}}} - with options {}`
      );
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

      expect(loggingSystemMock.collect(logger).debug[0][0]).toEqual(
        `executing query for rule .test-rule-type:abcdefg in space my-space - {\"body\":{\"query\":{\"bool\":{\"filter\":{\"range\":{\"@timestamp\":{\"gte\":0}}}}}}} - with options {}`
      );
      expect(logger.warn).not.toHaveBeenCalled();
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

      expect(loggingSystemMock.collect(logger).debug[0][0]).toEqual(
        `executing query for rule .test-rule-type:abcdefg in space my-space - {\"body\":{\"query\":{\"bool\":{\"filter\":{\"range\":{\"@timestamp\":{\"gte\":0}}}}}}} - with options {}`
      );
      expect(logger.warn).not.toHaveBeenCalled();
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
        abortableSearchClient.asInternalUser.search(esQuery)
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Search has been aborted due to cancelled execution"`
      );

      expect(loggingSystemMock.collect(logger).debug[0][0]).toEqual(
        `executing query for rule .test-rule-type:abcdefg in space my-space - {\"body\":{\"query\":{\"bool\":{\"filter\":{\"range\":{\"@timestamp\":{\"gte\":0}}}}}}} - with options {}`
      );
      expect(logger.warn).not.toHaveBeenCalled();
    });
  });

  describe('eql.search', () => {
    test('uses asInternalUser when specified', async () => {
      const { abortController, scopedClusterClient, childClient } = getMockClusterClients();

      const asInternalUserWrappedSearchFn = childClient.eql.search;

      const wrappedSearchClient = createWrappedScopedClusterClientFactory({
        scopedClusterClient,
        rule,
        logger,
        abortController,
        requestTimeout: 5000,
      }).client();

      await wrappedSearchClient.asInternalUser.eql.search(eqlQuery);

      expect(asInternalUserWrappedSearchFn).toHaveBeenCalledWith(eqlQuery, {
        signal: abortController.signal,
        requestTimeout: 5000,
      });
      expect(scopedClusterClient.asInternalUser.search).not.toHaveBeenCalled();
      expect(scopedClusterClient.asCurrentUser.search).not.toHaveBeenCalled();
      expect(loggingSystemMock.collect(logger).debug[0][0]).toEqual(
        'executing eql query for rule .test-rule-type:abcdefg in space my-space - {"index":"foo","query":"process where process.name == \\"regsvr32.exe\\""} - with options {} and 5000ms requestTimeout'
      );
      expect(logger.warn).not.toHaveBeenCalled();
    });

    test('uses asCurrentUser when specified', async () => {
      const { abortController, scopedClusterClient, childClient } = getMockClusterClients(true);

      const asCurrentUserWrappedSearchFn = childClient.eql.search;

      const wrappedSearchClient = createWrappedScopedClusterClientFactory({
        scopedClusterClient,
        rule,
        logger,
        abortController,
        requestTimeout: 5000,
      }).client();
      await wrappedSearchClient.asCurrentUser.eql.search(eqlQuery);

      expect(asCurrentUserWrappedSearchFn).toHaveBeenCalledWith(eqlQuery, {
        signal: abortController.signal,
        requestTimeout: 5000,
      });
      expect(scopedClusterClient.asInternalUser.search).not.toHaveBeenCalled();
      expect(scopedClusterClient.asCurrentUser.search).not.toHaveBeenCalled();
      expect(loggingSystemMock.collect(logger).debug[0][0]).toEqual(
        'executing eql query for rule .test-rule-type:abcdefg in space my-space - {"index":"foo","query":"process where process.name == \\"regsvr32.exe\\""} - with options {} and 5000ms requestTimeout'
      );
      expect(logger.warn).not.toHaveBeenCalled();
    });

    test('uses search options when specified', async () => {
      const { abortController, scopedClusterClient, childClient } = getMockClusterClients();

      const asInternalUserWrappedSearchFn = childClient.eql.search;

      const wrappedSearchClient = createWrappedScopedClusterClientFactory({
        scopedClusterClient,
        rule,
        logger,
        abortController,
        requestTimeout: 5000,
      }).client();
      await wrappedSearchClient.asInternalUser.eql.search(eqlQuery, {
        ignore: [404],
        requestTimeout: 10000,
      });

      expect(asInternalUserWrappedSearchFn).toHaveBeenCalledWith(eqlQuery, {
        ignore: [404],
        signal: abortController.signal,
        requestTimeout: 5000,
      });
      expect(scopedClusterClient.asInternalUser.search).not.toHaveBeenCalled();
      expect(scopedClusterClient.asCurrentUser.search).not.toHaveBeenCalled();

      expect(loggingSystemMock.collect(logger).debug[0][0]).toEqual(
        'executing eql query for rule .test-rule-type:abcdefg in space my-space - {"index":"foo","query":"process where process.name == \\"regsvr32.exe\\""} - with options {"ignore":[404],"requestTimeout":10000} and 5000ms requestTimeout'
      );
      expect(logger.warn).not.toHaveBeenCalled();
    });

    test('re-throws error and logs when an error is thrown', async () => {
      const { abortController, scopedClusterClient, childClient } = getMockClusterClients();

      childClient.eql.search.mockRejectedValueOnce(new Error('something went wrong!'));

      const wrappedSearchClient = createWrappedScopedClusterClientFactory({
        scopedClusterClient,
        rule,
        logger,
        abortController,
      }).client();

      await expect(
        wrappedSearchClient.asInternalUser.eql.search(eqlQuery)
      ).rejects.toThrowErrorMatchingInlineSnapshot(`"something went wrong!"`);

      expect(loggingSystemMock.collect(logger).debug[0][0]).toEqual(
        'executing eql query for rule .test-rule-type:abcdefg in space my-space - {"index":"foo","query":"process where process.name == \\"regsvr32.exe\\""} - with options {}'
      );
      expect(logger.warn).toHaveBeenCalledWith(
        'executing eql query for rule .test-rule-type:abcdefg in space my-space - {"index":"foo","query":"process where process.name == \\"regsvr32.exe\\""} - with options {}'
      );
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

      expect(loggingSystemMock.collect(logger).debug[0][0]).toEqual(
        `executing eql query for rule .test-rule-type:abcdefg in space my-space - {\"index\":\"foo\",\"query\":\"process where process.name == \\\"regsvr32.exe\\\"\"} - with options {}`
      );
      expect(logger.warn).not.toHaveBeenCalled();
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
        abortableSearchClient.asInternalUser.eql.search(eqlQuery)
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"EQL search has been aborted due to cancelled execution"`
      );

      expect(loggingSystemMock.collect(logger).debug[0][0]).toEqual(
        `executing eql query for rule .test-rule-type:abcdefg in space my-space - {\"index\":\"foo\",\"query\":\"process where process.name == \\\"regsvr32.exe\\\"\"} - with options {}`
      );
      expect(logger.warn).not.toHaveBeenCalled();
    });
  });

  describe('transport.request', () => {
    describe('ES|QL', () => {
      test('uses asInternalUser when specified', async () => {
        const { abortController, scopedClusterClient, childClient } = getMockClusterClients();

        const asInternalUserWrappedSearchFn = childClient.transport.request;

        const wrappedSearchClient = createWrappedScopedClusterClientFactory({
          scopedClusterClient,
          rule,
          logger,
          abortController,
          requestTimeout: 5000,
        }).client();

        await wrappedSearchClient.asInternalUser.transport.request(esqlQueryRequest);

        expect(asInternalUserWrappedSearchFn).toHaveBeenCalledWith(esqlQueryRequest, {
          signal: abortController.signal,
          requestTimeout: 5000,
        });
        expect(scopedClusterClient.asInternalUser.search).not.toHaveBeenCalled();
        expect(scopedClusterClient.asCurrentUser.search).not.toHaveBeenCalled();

        expect(loggingSystemMock.collect(logger).debug[0][0]).toEqual(
          'executing ES|QL query for rule .test-rule-type:abcdefg in space my-space - {"method":"POST","path":"/_query","body":{"query":"from .kibana_task_manager"}} - with options {} and 5000ms requestTimeout'
        );
        expect(logger.warn).not.toHaveBeenCalled();
      });

      test('uses asCurrentUser when specified', async () => {
        const { abortController, scopedClusterClient, childClient } = getMockClusterClients(true);

        const asCurrentUserWrappedSearchFn = childClient.transport.request;

        const wrappedSearchClient = createWrappedScopedClusterClientFactory({
          scopedClusterClient,
          rule,
          logger,
          abortController,
          requestTimeout: 5000,
        }).client();
        await wrappedSearchClient.asCurrentUser.transport.request(esqlQueryRequest);

        expect(asCurrentUserWrappedSearchFn).toHaveBeenCalledWith(esqlQueryRequest, {
          signal: abortController.signal,
          requestTimeout: 5000,
        });
        expect(scopedClusterClient.asInternalUser.search).not.toHaveBeenCalled();
        expect(scopedClusterClient.asCurrentUser.search).not.toHaveBeenCalled();
        expect(loggingSystemMock.collect(logger).debug[0][0]).toEqual(
          'executing ES|QL query for rule .test-rule-type:abcdefg in space my-space - {"method":"POST","path":"/_query","body":{"query":"from .kibana_task_manager"}} - with options {} and 5000ms requestTimeout'
        );
        expect(logger.warn).not.toHaveBeenCalled();
      });

      test('uses search options when specified', async () => {
        const { abortController, scopedClusterClient, childClient } = getMockClusterClients();

        const asInternalUserWrappedSearchFn = childClient.transport.request;

        const wrappedSearchClient = createWrappedScopedClusterClientFactory({
          scopedClusterClient,
          rule,
          logger,
          abortController,
          requestTimeout: 5000,
        }).client();
        await wrappedSearchClient.asInternalUser.transport.request(esqlQueryRequest, {
          ignore: [404],
          requestTimeout: 10000,
        });

        expect(asInternalUserWrappedSearchFn).toHaveBeenCalledWith(esqlQueryRequest, {
          ignore: [404],
          signal: abortController.signal,
          requestTimeout: 5000,
        });
        expect(scopedClusterClient.asInternalUser.search).not.toHaveBeenCalled();
        expect(scopedClusterClient.asCurrentUser.search).not.toHaveBeenCalled();

        expect(loggingSystemMock.collect(logger).debug[0][0]).toEqual(
          'executing ES|QL query for rule .test-rule-type:abcdefg in space my-space - {"method":"POST","path":"/_query","body":{"query":"from .kibana_task_manager"}} - with options {"ignore":[404],"requestTimeout":10000} and 5000ms requestTimeout'
        );
        expect(logger.warn).not.toHaveBeenCalled();
      });

      test('re-throws error and logs when an error is thrown', async () => {
        const { abortController, scopedClusterClient, childClient } = getMockClusterClients();

        childClient.transport.request.mockRejectedValueOnce(new Error('something went wrong!'));

        const wrappedSearchClient = createWrappedScopedClusterClientFactory({
          scopedClusterClient,
          rule,
          logger,
          abortController,
        }).client();

        await expect(
          wrappedSearchClient.asInternalUser.transport.request({ method: 'POST', path: '/_query' })
        ).rejects.toThrowErrorMatchingInlineSnapshot(`"something went wrong!"`);

        expect(loggingSystemMock.collect(logger).debug[0][0]).toEqual(
          'executing ES|QL query for rule .test-rule-type:abcdefg in space my-space - {"method":"POST","path":"/_query"} - with options {}'
        );
        expect(logger.warn).toHaveBeenCalledWith(
          'executing ES|QL query for rule .test-rule-type:abcdefg in space my-space - {"method":"POST","path":"/_query"} - with options {}'
        );
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

        expect(loggingSystemMock.collect(logger).debug[0][0]).toEqual(
          `executing ES|QL query for rule .test-rule-type:abcdefg in space my-space - {\"method\":\"POST\",\"path\":\"/_query\",\"body\":{\"query\":\"from .kibana_task_manager\"}} - with options {}`
        );
        expect(logger.warn).not.toHaveBeenCalled();
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
          abortableSearchClient.asInternalUser.transport.request({
            method: 'POST',
            path: '/_query',
          })
        ).rejects.toThrowErrorMatchingInlineSnapshot(
          `"ES|QL search has been aborted due to cancelled execution"`
        );

        expect(loggingSystemMock.collect(logger).debug[0][0]).toEqual(
          `executing ES|QL query for rule .test-rule-type:abcdefg in space my-space - {\"method\":\"POST\",\"path\":\"/_query\"} - with options {}`
        );
        expect(logger.warn).not.toHaveBeenCalled();
      });
    });

    test('uses asInternalUser when specified', async () => {
      const { abortController, scopedClusterClient, childClient } = getMockClusterClients();

      const asInternalUserWrappedSearchFn = childClient.transport.request;

      const wrappedSearchClient = createWrappedScopedClusterClientFactory({
        scopedClusterClient,
        rule,
        logger,
        abortController,
        requestTimeout: 5000,
      }).client();

      await wrappedSearchClient.asInternalUser.transport.request({ method: '', path: '' });

      expect(asInternalUserWrappedSearchFn).toHaveBeenCalledWith(
        { method: '', path: '' },
        { requestTimeout: 5000 }
      );
      expect(scopedClusterClient.asInternalUser.search).not.toHaveBeenCalled();
      expect(scopedClusterClient.asCurrentUser.search).not.toHaveBeenCalled();

      expect(loggingSystemMock.collect(logger).debug).toEqual([]);
      expect(logger.warn).not.toHaveBeenCalled();
    });

    test('uses asCurrentUser when specified', async () => {
      const { abortController, scopedClusterClient, childClient } = getMockClusterClients(true);

      const asCurrentUserWrappedSearchFn = childClient.transport.request;

      const wrappedSearchClient = createWrappedScopedClusterClientFactory({
        scopedClusterClient,
        rule,
        logger,
        abortController,
        requestTimeout: 5000,
      }).client();
      await wrappedSearchClient.asCurrentUser.transport.request({ method: '', path: '' });

      expect(asCurrentUserWrappedSearchFn).toHaveBeenCalledWith(
        { method: '', path: '' },
        {
          requestTimeout: 5000,
        }
      );
      expect(scopedClusterClient.asInternalUser.search).not.toHaveBeenCalled();
      expect(scopedClusterClient.asCurrentUser.search).not.toHaveBeenCalled();

      expect(loggingSystemMock.collect(logger).debug).toEqual([]);
      expect(logger.warn).not.toHaveBeenCalled();
    });

    test('uses search options when specified', async () => {
      const { abortController, scopedClusterClient, childClient } = getMockClusterClients();

      const asInternalUserWrappedSearchFn = childClient.transport.request;

      const wrappedSearchClient = createWrappedScopedClusterClientFactory({
        scopedClusterClient,
        rule,
        logger,
        abortController,
        requestTimeout: 5000,
      }).client();
      await wrappedSearchClient.asInternalUser.transport.request(
        { method: '', path: '' },
        {
          ignore: [404],
          requestTimeout: 10000,
        }
      );

      expect(asInternalUserWrappedSearchFn).toHaveBeenCalledWith(
        { method: '', path: '' },
        {
          ignore: [404],
          requestTimeout: 5000,
        }
      );
      expect(scopedClusterClient.asInternalUser.search).not.toHaveBeenCalled();
      expect(scopedClusterClient.asCurrentUser.search).not.toHaveBeenCalled();

      expect(loggingSystemMock.collect(logger).debug).toEqual([]);
      expect(logger.warn).not.toHaveBeenCalled();
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

      expect(loggingSystemMock.collect(logger).debug).toEqual([]);
      expect(logger.warn).not.toHaveBeenCalled();
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

      expect(loggingSystemMock.collect(logger).debug).toEqual([]);
      expect(logger.warn).not.toHaveBeenCalled();
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
