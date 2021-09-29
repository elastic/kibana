/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pRetry from 'p-retry';
import { BulkRequest } from '@elastic/elasticsearch/api/types';
import { ResponseError } from '@elastic/elasticsearch/lib/errors';
import { Either, isLeft } from 'fp-ts/lib/Either';

import { ElasticsearchClient } from 'kibana/server';
import { Logger } from 'kibana/server';
import { IndexPatternsFetcher } from '../../../../../src/plugins/data/server';

import { RuleDataWriteDisabledError } from '../rule_data_plugin_service/errors';
import { IndexInfo } from '../rule_data_plugin_service/index_info';
import { ResourceInstaller } from '../rule_data_plugin_service/resource_installer';
import { IRuleDataClient, IRuleDataReader, IRuleDataWriter } from './types';

interface ConstructorOptions {
  indexInfo: IndexInfo;
  resourceInstaller: ResourceInstaller;
  isWriteEnabled: boolean;
  waitUntilReadyForReading: Promise<WaitResult>;
  waitUntilReadyForWriting: Promise<WaitResult>;
  logger: Logger;
}

export type WaitResult = Either<Error, ElasticsearchClient>;

export class RuleDataClient implements IRuleDataClient {
  private _isWriteEnabled: boolean = false;

  // Writers cached by namespace
  private writerCache: Map<string, IRuleDataWriter>;

  constructor(private readonly options: ConstructorOptions) {
    this.writeEnabled = this.options.isWriteEnabled;
    this.writerCache = new Map();
  }

  public get indexName(): string {
    return this.options.indexInfo.baseName;
  }

  public get kibanaVersion(): string {
    return this.options.indexInfo.kibanaVersion;
  }

  private get writeEnabled(): boolean {
    return this._isWriteEnabled;
  }

  private set writeEnabled(isEnabled: boolean) {
    this._isWriteEnabled = isEnabled;
  }

  public isWriteEnabled(): boolean {
    return this.writeEnabled;
  }

  public getReader(options: { namespace?: string } = {}): IRuleDataReader {
    const { indexInfo } = this.options;
    const indexPattern = indexInfo.getPatternForReading(options.namespace);

    const waitUntilReady = async () => {
      const result = await this.options.waitUntilReadyForReading;
      if (isLeft(result)) {
        throw result.left;
      } else {
        return result.right;
      }
    };

    return {
      search: async (request) => {
        const clusterClient = await waitUntilReady();

        const { body } = (await clusterClient.search({
          ...request,
          index: indexPattern,
        })) as { body: any };

        return body;
      },

      getDynamicIndexPattern: async () => {
        const clusterClient = await waitUntilReady();
        const indexPatternsFetcher = new IndexPatternsFetcher(clusterClient);

        try {
          const fields = await indexPatternsFetcher.getFieldsForWildcard({
            pattern: indexPattern,
          });

          return {
            fields,
            timeFieldName: '@timestamp',
            title: indexPattern,
          };
        } catch (err) {
          if (err.output?.payload?.code === 'no_matching_indices') {
            return {
              fields: [],
              timeFieldName: '@timestamp',
              title: indexPattern,
            };
          }
          throw err;
        }
      },
    };
  }

  public getWriter(options: { namespace?: string } = {}): IRuleDataWriter {
    const namespace = options.namespace || 'default';
    const cachedWriter = this.writerCache.get(namespace);

    // There is no cached writer, so we'll install / update the namespace specific resources now.
    if (!cachedWriter) {
      const writerForNamespace = this.initializeWriter(namespace);
      this.writerCache.set(namespace, writerForNamespace);
      return writerForNamespace;
    } else {
      return cachedWriter;
    }
  }

  private initializeWriter(namespace: string): IRuleDataWriter {
    const isWriteEnabled = () => this.writeEnabled;

    const { indexInfo, resourceInstaller } = this.options;
    const alias = indexInfo.getPrimaryAlias(namespace);

    // Wait until both index and namespace level resources have been installed / updated.
    const waitUntilReady = async () => {
      const failAndTurnOffWrite = (context: string, error: Error) => {
        this.options.logger.error(
          `There has been a catastrophic error trying to install ${context} level resources. Writing can no longer continue, and has been disabled for the following registration context: ${indexInfo.indexOptions.registrationContext}. 
          This may have been due to a non-additive change to the mappings, removal and type changes are not permitted. Full error: ${error}`
        );
        this.writeEnabled = false;
      };

      const indexLevelResourcesResult = await this.options.waitUntilReadyForWriting;

      if (isLeft(indexLevelResourcesResult)) {
        failAndTurnOffWrite('index', indexLevelResourcesResult.left);
        throw indexLevelResourcesResult.left;
      } else {
        try {
          await pRetry(
            async () => {
              await resourceInstaller.installAndUpdateNamespaceLevelResources(indexInfo, namespace);
            },
            { retries: 2 }
          );
          return indexLevelResourcesResult.right;
        } catch (e) {
          failAndTurnOffWrite('namespace', e);
          throw e;
        }
      }
    };

    const waitUntilReadyResult = waitUntilReady();

    return {
      bulk: async (request: BulkRequest) => {
        if (!isWriteEnabled()) {
          throw new RuleDataWriteDisabledError();
        }

        return waitUntilReadyResult
          .then((clusterClient) => {
            const requestWithDefaultParameters = {
              ...request,
              require_alias: true,
              index: alias,
            };

            return clusterClient.bulk(requestWithDefaultParameters).then((response) => {
              if (response.body.errors) {
                const error = new ResponseError(response);
                throw error;
              }
              return response;
            });
          })
          .catch((error) => {
            this.options.logger.error(
              `The writer for the Rule Data Client for the ${indexInfo.indexOptions.registrationContext} registration context was not initialized properly, bulk() cannot continue. 
              Full error: ${error}`
            );
            return undefined;
          });
      },
    };
  }
}
