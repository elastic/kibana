/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { left, right } from 'fp-ts/lib/Either';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { RuleDataClient, RuleDataClientConstructorOptions, WaitResult } from './rule_data_client';
import { IndexInfo } from '../rule_data_plugin_service/index_info';
import { Dataset, RuleDataWriterInitializationError } from '..';
import { resourceInstallerMock } from '../rule_data_plugin_service/resource_installer.mock';
import { loggingSystemMock, elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { IndexPatternsFetcher } from '@kbn/data-plugin/server';
import { createNoMatchingIndicesError } from '@kbn/data-views-plugin/server/fetcher/lib/errors';
import { ElasticsearchClient } from '@kbn/core/server';

const logger: ReturnType<typeof loggingSystemMock.createLogger> = loggingSystemMock.createLogger();
const scopedClusterClient = elasticsearchServiceMock.createScopedClusterClient().asInternalUser;
const mockResourceInstaller = resourceInstallerMock.create();

// Be careful setting this delay too high. Jest tests can time out
const delay = (ms: number = 1500) => new Promise((resolve) => setTimeout(resolve, ms));

interface GetRuleDataClientOptionsOpts {
  isWriteEnabled?: boolean;
  isWriterCacheEnabled?: boolean;
  waitUntilReadyForReading?: Promise<WaitResult>;
  waitUntilReadyForWriting?: Promise<WaitResult>;
}
function getRuleDataClientOptions({
  isWriteEnabled,
  isWriterCacheEnabled,
  waitUntilReadyForReading,
  waitUntilReadyForWriting,
}: GetRuleDataClientOptionsOpts): RuleDataClientConstructorOptions {
  return {
    indexInfo: new IndexInfo({
      indexOptions: {
        feature: 'apm',
        registrationContext: 'observability.apm',
        dataset: 'alerts' as Dataset,
        componentTemplateRefs: [],
        componentTemplates: [],
      },
      kibanaVersion: '8.2.0',
    }),
    resourceInstaller: mockResourceInstaller,
    isWriteEnabled: isWriteEnabled ?? true,
    isWriterCacheEnabled: isWriterCacheEnabled ?? true,
    waitUntilReadyForReading:
      waitUntilReadyForReading ?? Promise.resolve(right(scopedClusterClient) as WaitResult),
    waitUntilReadyForWriting:
      waitUntilReadyForWriting ?? Promise.resolve(right(scopedClusterClient) as WaitResult),
    logger,
  };
}

describe('RuleDataClient', () => {
  const getFieldsForWildcardMock = jest.fn();

  test('options are set correctly in constructor', () => {
    const namespace = 'test';
    const ruleDataClient = new RuleDataClient(getRuleDataClientOptions({}));
    expect(ruleDataClient.indexName).toEqual(`.alerts-observability.apm.alerts`);
    expect(ruleDataClient.kibanaVersion).toEqual('8.2.0');
    expect(ruleDataClient.indexNameWithNamespace(namespace)).toEqual(
      `.alerts-observability.apm.alerts-${namespace}`
    );
    expect(ruleDataClient.isWriteEnabled()).toEqual(true);
  });

  describe('getReader()', () => {
    beforeEach(() => {
      jest.resetAllMocks();
      getFieldsForWildcardMock.mockResolvedValue({ fields: ['foo'] });
      IndexPatternsFetcher.prototype.getFieldsForWildcard = getFieldsForWildcardMock;
    });

    afterAll(() => {
      getFieldsForWildcardMock.mockRestore();
    });

    test('waits until cluster client is ready before searching', async () => {
      const ruleDataClient = new RuleDataClient(
        getRuleDataClientOptions({
          waitUntilReadyForReading: new Promise((resolve) =>
            setTimeout(resolve, 3000, right(scopedClusterClient))
          ),
        })
      );

      const query = { query: { bool: { filter: { range: { '@timestamp': { gte: 0 } } } } } };
      const reader = ruleDataClient.getReader();
      await reader.search({
        body: query,
      });

      expect(scopedClusterClient.search).toHaveBeenCalledWith({
        body: query,
        index: `.alerts-observability.apm.alerts*`,
      });
    });

    test('re-throws error when search throws error', async () => {
      scopedClusterClient.search.mockRejectedValueOnce(new Error('something went wrong!'));
      const ruleDataClient = new RuleDataClient(getRuleDataClientOptions({}));
      const query = { query: { bool: { filter: { range: { '@timestamp': { gte: 0 } } } } } };
      const reader = ruleDataClient.getReader();

      await expect(
        reader.search({
          body: query,
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(`"something went wrong!"`);

      expect(logger.error).toHaveBeenCalledWith(
        `Error performing search in RuleDataClient - something went wrong!`
      );
    });

    test('waits until cluster client is ready before getDynamicIndexPattern', async () => {
      const ruleDataClient = new RuleDataClient(
        getRuleDataClientOptions({
          waitUntilReadyForReading: new Promise((resolve) =>
            setTimeout(resolve, 3000, right(scopedClusterClient))
          ),
        })
      );

      const reader = ruleDataClient.getReader();
      expect(await reader.getDynamicIndexPattern()).toEqual({
        fields: ['foo'],
        timeFieldName: '@timestamp',
        title: '.alerts-observability.apm.alerts*',
      });
    });

    test('re-throws generic errors from getFieldsForWildcard', async () => {
      getFieldsForWildcardMock.mockRejectedValueOnce(new Error('something went wrong!'));
      const ruleDataClient = new RuleDataClient(getRuleDataClientOptions({}));
      const reader = ruleDataClient.getReader();

      await expect(reader.getDynamicIndexPattern()).rejects.toThrowErrorMatchingInlineSnapshot(
        `"something went wrong!"`
      );

      expect(logger.error).toHaveBeenCalledWith(
        `Error fetching index patterns in RuleDataClient - something went wrong!`
      );
    });

    test('correct handles no_matching_indices errors from getFieldsForWildcard', async () => {
      getFieldsForWildcardMock.mockRejectedValueOnce(createNoMatchingIndicesError([]));
      const ruleDataClient = new RuleDataClient(getRuleDataClientOptions({}));
      const reader = ruleDataClient.getReader();

      expect(await reader.getDynamicIndexPattern()).toEqual({
        fields: [],
        timeFieldName: '@timestamp',
        title: '.alerts-observability.apm.alerts*',
      });

      expect(logger.error).not.toHaveBeenCalled();
    });

    test('handles errors getting cluster client', async () => {
      const ruleDataClient = new RuleDataClient(
        getRuleDataClientOptions({
          waitUntilReadyForReading: Promise.resolve(
            left(new Error('could not get cluster client'))
          ),
        })
      );

      const query = { query: { bool: { filter: { range: { '@timestamp': { gte: 0 } } } } } };
      const reader = ruleDataClient.getReader();
      await expect(
        reader.search({
          body: query,
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(`"could not get cluster client"`);

      await expect(reader.getDynamicIndexPattern()).rejects.toThrowErrorMatchingInlineSnapshot(
        `"could not get cluster client"`
      );
    });
  });

  describe('getWriter()', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('throws error if writing is disabled', async () => {
      const ruleDataClient = new RuleDataClient(
        getRuleDataClientOptions({ isWriteEnabled: false })
      );

      await expect(() => ruleDataClient.getWriter()).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Rule registry writing is disabled. Make sure that \\"xpack.ruleRegistry.write.enabled\\" configuration is not set to false and \\"observability.apm\\" is not disabled in \\"xpack.ruleRegistry.write.disabledRegistrationContexts\\" within \\"kibana.yml\\"."`
      );
      expect(logger.debug).toHaveBeenCalledWith(
        `Writing is disabled, bulk() will not write any data.`
      );
    });

    test('throws error if initialization of writer fails due to index error', async () => {
      const ruleDataClient = new RuleDataClient(
        getRuleDataClientOptions({
          waitUntilReadyForWriting: Promise.resolve(
            left(new Error('could not get cluster client'))
          ),
        })
      );
      expect(ruleDataClient.isWriteEnabled()).toBe(true);
      await expect(() => ruleDataClient.getWriter()).rejects.toThrowErrorMatchingInlineSnapshot(
        `"There has been a catastrophic error trying to install index level resources for the following registration context: observability.apm. This may have been due to a non-additive change to the mappings, removal and type changes are not permitted. Full error: Error: could not get cluster client"`
      );
      expect(logger.error).toHaveBeenNthCalledWith(
        1,
        new RuleDataWriterInitializationError(
          'index',
          'observability.apm',
          new Error('could not get cluster client')
        )
      );
      expect(logger.error).toHaveBeenNthCalledWith(
        2,
        `The writer for the Rule Data Client for the observability.apm registration context was not initialized properly, bulk() cannot continue, and writing will be disabled.`
      );
      expect(ruleDataClient.isWriteEnabled()).toBe(false);

      // getting the writer again at this point should throw another error
      await expect(() => ruleDataClient.getWriter()).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Rule registry writing is disabled due to an error during Rule Data Client initialization."`
      );
      expect(logger.debug).toHaveBeenCalledWith(
        `Writing is disabled, bulk() will not write any data.`
      );
    });

    test('throws error if initialization of writer fails due to namespace error', async () => {
      mockResourceInstaller.installAndUpdateNamespaceLevelResources.mockRejectedValueOnce(
        new Error('bad resource installation')
      );
      const ruleDataClient = new RuleDataClient(getRuleDataClientOptions({}));
      expect(ruleDataClient.isWriteEnabled()).toBe(true);
      await expect(() => ruleDataClient.getWriter()).rejects.toThrowErrorMatchingInlineSnapshot(
        `"There has been a catastrophic error trying to install namespace level resources for the following registration context: observability.apm. This may have been due to a non-additive change to the mappings, removal and type changes are not permitted. Full error: Error: bad resource installation"`
      );
      expect(logger.error).toHaveBeenNthCalledWith(
        1,
        new RuleDataWriterInitializationError(
          'namespace',
          'observability.apm',
          new Error('bad resource installation')
        )
      );
      expect(logger.error).toHaveBeenNthCalledWith(
        2,
        `The writer for the Rule Data Client for the observability.apm registration context was not initialized properly, bulk() cannot continue, and writing will be disabled.`
      );
      expect(ruleDataClient.isWriteEnabled()).toBe(false);

      // getting the writer again at this point should throw another error
      await expect(() => ruleDataClient.getWriter()).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Rule registry writing is disabled due to an error during Rule Data Client initialization."`
      );
      expect(logger.debug).toHaveBeenCalledWith(
        `Writing is disabled, bulk() will not write any data.`
      );
    });

    test('uses cached cluster client when repeatedly initializing writer', async () => {
      const ruleDataClient = new RuleDataClient(getRuleDataClientOptions({}));

      await ruleDataClient.getWriter();
      await ruleDataClient.getWriter();
      await ruleDataClient.getWriter();
      await ruleDataClient.getWriter();
      await ruleDataClient.getWriter();

      expect(mockResourceInstaller.installAndUpdateNamespaceLevelResources).toHaveBeenCalledTimes(
        1
      );
    });
  });

  describe('bulk()', () => {
    test('logs debug and returns undefined if clusterClient is not defined', async () => {
      const ruleDataClient = new RuleDataClient(
        getRuleDataClientOptions({
          waitUntilReadyForWriting: new Promise((resolve) =>
            resolve(right(undefined as unknown as ElasticsearchClient))
          ),
        })
      );
      const writer = await ruleDataClient.getWriter();

      // Previously, a delay between calling getWriter() and using a writer function
      // would cause an Unhandled promise rejection if there were any errors getting a writer
      // Adding this delay in the tests to ensure this does not pop up again.
      await delay();

      expect(await writer.bulk({})).toEqual(undefined);
      expect(logger.debug).toHaveBeenCalledWith(
        `Writing is disabled, bulk() will not write any data.`
      );
    });

    test('throws and logs error if bulk function throws error', async () => {
      const error = new Error('something went wrong!');
      scopedClusterClient.bulk.mockRejectedValueOnce(error);
      const ruleDataClient = new RuleDataClient(getRuleDataClientOptions({}));
      expect(ruleDataClient.isWriteEnabled()).toBe(true);
      const writer = await ruleDataClient.getWriter();

      // Previously, a delay between calling getWriter() and using a writer function
      // would cause an Unhandled promise rejection if there were any errors getting a writer
      // Adding this delay in the tests to ensure this does not pop up again.
      await delay();

      await expect(() => writer.bulk({})).rejects.toThrowErrorMatchingInlineSnapshot(
        `"something went wrong!"`
      );
      expect(logger.error).toHaveBeenNthCalledWith(1, error);
      expect(ruleDataClient.isWriteEnabled()).toBe(true);
    });

    test('waits until cluster client is ready before calling bulk', async () => {
      scopedClusterClient.bulk.mockResolvedValueOnce(
        elasticsearchClientMock.createSuccessTransportRequestPromise(
          {}
        ) as unknown as estypes.BulkResponse
      );
      const ruleDataClient = new RuleDataClient(
        getRuleDataClientOptions({
          waitUntilReadyForWriting: new Promise((resolve) =>
            setTimeout(resolve, 3000, right(scopedClusterClient))
          ),
        })
      );

      const writer = await ruleDataClient.getWriter();
      // Previously, a delay between calling getWriter() and using a writer function
      // would cause an Unhandled promise rejection if there were any errors getting a writer
      // Adding this delay in the tests to ensure this does not pop up again.
      await delay();

      const response = await writer.bulk({});

      expect(response).toEqual({
        body: {},
        headers: {
          'x-elastic-product': 'Elasticsearch',
        },
        meta: {},
        statusCode: 200,
        warnings: [],
      });

      expect(scopedClusterClient.bulk).toHaveBeenCalledWith(
        {
          index: `.alerts-observability.apm.alerts-default`,
          require_alias: true,
        },
        { meta: true }
      );
    });
  });
});
