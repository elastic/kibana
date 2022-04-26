/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { left, right } from 'fp-ts/lib/Either';
import { RuleDataClient, RuleDataClientConstructorOptions, WaitResult } from './rule_data_client';
import { IndexInfo } from '../rule_data_plugin_service/index_info';
import { Dataset, RuleDataWriterInitializationError } from '..';
import { resourceInstallerMock } from '../rule_data_plugin_service/resource_installer.mock';
import { loggingSystemMock, elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { IndexPatternsFetcher } from '@kbn/data-plugin/server';
import { createNoMatchingIndicesError } from '@kbn/data-views-plugin/server/fetcher/lib/errors';

const mockLogger = loggingSystemMock.create().get();
const scopedClusterClient = elasticsearchServiceMock.createScopedClusterClient().asInternalUser;
const mockResourceInstaller = resourceInstallerMock.create();

// Be careful setting this delay too high. Jest tests can time out
const delay = (ms: number = 3000) => new Promise((resolve) => setTimeout(resolve, ms));

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
    logger: mockLogger,
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
    beforeAll(() => {
      getFieldsForWildcardMock.mockResolvedValue(['foo']);
      IndexPatternsFetcher.prototype.getFieldsForWildcard = getFieldsForWildcardMock;
    });

    beforeEach(() => {
      getFieldsForWildcardMock.mockClear();
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

    describe('bulk()', () => {
      test('logs debug and returns undefined if writing is disabled', async () => {
        const ruleDataClient = new RuleDataClient(
          getRuleDataClientOptions({ isWriteEnabled: false })
        );
        const writer = ruleDataClient.getWriter();

        // Previously, a delay between calling getWriter() and using a writer function
        // would cause an Unhandled promise rejection if there were any errors getting a writer
        // Adding this delay in the tests to ensure this does not pop up again.
        await delay();

        expect(await writer.bulk({})).toEqual(undefined);
        expect(mockLogger.debug).toHaveBeenCalledWith(
          `Writing is disabled, bulk() will not write any data.`
        );
      });

      test('logs error, returns undefined and turns off writing if initialization error', async () => {
        const ruleDataClient = new RuleDataClient(
          getRuleDataClientOptions({
            waitUntilReadyForWriting: Promise.resolve(
              left(new Error('could not get cluster client'))
            ),
          })
        );
        expect(ruleDataClient.isWriteEnabled()).toBe(true);
        const writer = ruleDataClient.getWriter();

        // Previously, a delay between calling getWriter() and using a writer function
        // would cause an Unhandled promise rejection if there were any errors getting a writer
        // Adding this delay in the tests to ensure this does not pop up again.
        await delay();

        expect(await writer.bulk({})).toEqual(undefined);
        expect(mockLogger.error).toHaveBeenNthCalledWith(
          1,
          new RuleDataWriterInitializationError(
            'index',
            'observability.apm',
            new Error('could not get cluster client')
          )
        );
        expect(mockLogger.error).toHaveBeenNthCalledWith(
          2,
          `The writer for the Rule Data Client for the observability.apm registration context was not initialized properly, bulk() cannot continue, and writing will be disabled.`
        );
        expect(ruleDataClient.isWriteEnabled()).toBe(false);
      });

      test('logs error, returns undefined and turns off writing if resource installation error', async () => {
        const error = new Error('bad resource installation');
        mockResourceInstaller.installAndUpdateNamespaceLevelResources.mockRejectedValueOnce(error);
        const ruleDataClient = new RuleDataClient(getRuleDataClientOptions({}));
        expect(ruleDataClient.isWriteEnabled()).toBe(true);
        const writer = ruleDataClient.getWriter();

        // Previously, a delay between calling getWriter() and using a writer function
        // would cause an Unhandled promise rejection if there were any errors getting a writer
        // Adding this delay in the tests to ensure this does not pop up again.
        await delay();

        expect(await writer.bulk({})).toEqual(undefined);
        expect(mockLogger.error).toHaveBeenNthCalledWith(
          1,
          new RuleDataWriterInitializationError('namespace', 'observability.apm', error)
        );
        expect(mockLogger.error).toHaveBeenNthCalledWith(
          2,
          `The writer for the Rule Data Client for the observability.apm registration context was not initialized properly, bulk() cannot continue, and writing will be disabled.`
        );
        expect(ruleDataClient.isWriteEnabled()).toBe(false);
      });

      test('logs error and returns undefined if bulk function throws error', async () => {
        const error = new Error('something went wrong!');
        scopedClusterClient.bulk.mockRejectedValueOnce(error);
        const ruleDataClient = new RuleDataClient(getRuleDataClientOptions({}));
        expect(ruleDataClient.isWriteEnabled()).toBe(true);
        const writer = ruleDataClient.getWriter();

        // Previously, a delay between calling getWriter() and using a writer function
        // would cause an Unhandled promise rejection if there were any errors getting a writer
        // Adding this delay in the tests to ensure this does not pop up again.
        await delay();

        expect(await writer.bulk({})).toEqual(undefined);
        expect(mockLogger.error).toHaveBeenNthCalledWith(1, error);
        expect(ruleDataClient.isWriteEnabled()).toBe(true);
      });

      test('waits until cluster client is ready before calling bulk', async () => {
        const ruleDataClient = new RuleDataClient(
          getRuleDataClientOptions({
            waitUntilReadyForWriting: new Promise((resolve) =>
              setTimeout(resolve, 3000, right(scopedClusterClient))
            ),
          })
        );

        const writer = ruleDataClient.getWriter();
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
});
