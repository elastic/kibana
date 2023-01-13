/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { Either, isLeft } from 'fp-ts/lib/Either';

import { ElasticsearchClient } from '@kbn/core/server';
import { Logger } from '@kbn/core/server';
import { IndexPatternsFetcher } from '@kbn/data-plugin/server';

import type { ESSearchRequest, ESSearchResponse } from '@kbn/es-types';
import {
  RuleDataWriteDisabledError,
  RuleDataWriterInitializationError,
} from '../rule_data_plugin_service/errors';
import { IndexInfo } from '../rule_data_plugin_service/index_info';
import { IResourceInstaller } from '../rule_data_plugin_service/resource_installer';
import { IRuleDataClient, IRuleDataReader, IRuleDataWriter } from './types';
import { ParsedTechnicalFields } from '../../common/parse_technical_fields';
import { ParsedExperimentalFields } from '../../common/parse_experimental_fields';

export interface RuleDataClientConstructorOptions {
  indexInfo: IndexInfo;
  resourceInstaller: IResourceInstaller;
  isWriteEnabled: boolean;
  isWriterCacheEnabled: boolean;
  waitUntilReadyForReading: Promise<WaitResult>;
  waitUntilReadyForWriting: Promise<WaitResult>;
  logger: Logger;
}

export type WaitResult = Either<Error, ElasticsearchClient>;

export class RuleDataClient implements IRuleDataClient {
  private _isWriteEnabled: boolean = false;
  private _isWriteInitializationFailed: boolean = false;
  private _isWriterCacheEnabled: boolean = true;

  // Writers cached by namespace
  private writerCache: Map<string, IRuleDataWriter>;

  private clusterClient: ElasticsearchClient | null = null;

  constructor(private readonly options: RuleDataClientConstructorOptions) {
    this.writeEnabled = this.options.isWriteEnabled;
    this.writerCacheEnabled = this.options.isWriterCacheEnabled;
    this.writerCache = new Map();
  }

  public get indexName(): string {
    return this.options.indexInfo.baseName;
  }

  public get kibanaVersion(): string {
    return this.options.indexInfo.kibanaVersion;
  }

  public indexNameWithNamespace(namespace: string): string {
    return this.options.indexInfo.getPrimaryAlias(namespace);
  }

  private get writeEnabled(): boolean {
    return this._isWriteEnabled;
  }

  private set writeEnabled(isEnabled: boolean) {
    this._isWriteEnabled = isEnabled;
  }

  private get writeInitializationFailed(): boolean {
    return this._isWriteInitializationFailed;
  }

  private set writeInitializationFailed(isFailed: boolean) {
    this._isWriteInitializationFailed = isFailed;
  }

  public isWriteEnabled(): boolean {
    return this.writeEnabled;
  }

  private get writerCacheEnabled(): boolean {
    return this._isWriterCacheEnabled;
  }

  private set writerCacheEnabled(isEnabled: boolean) {
    this._isWriterCacheEnabled = isEnabled;
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
      search: async <
        TSearchRequest extends ESSearchRequest,
        TAlertDoc = Partial<ParsedTechnicalFields & ParsedExperimentalFields>
      >(
        request: TSearchRequest
      ): Promise<ESSearchResponse<TAlertDoc, TSearchRequest>> => {
        try {
          const clusterClient = await waitUntilReady();
          return (await clusterClient.search({
            ...request,
            index: indexPattern,
          })) as unknown as ESSearchResponse<TAlertDoc, TSearchRequest>;
        } catch (err) {
          this.options.logger.error(`Error performing search in RuleDataClient - ${err.message}`);
          throw err;
        }
      },

      getDynamicIndexPattern: async () => {
        const clusterClient = await waitUntilReady();
        const indexPatternsFetcher = new IndexPatternsFetcher(clusterClient);

        try {
          const { fields } = await indexPatternsFetcher.getFieldsForWildcard({
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
          this.options.logger.error(
            `Error fetching index patterns in RuleDataClient - ${err.message}`
          );
          throw err;
        }
      },
    };
  }

  public async getWriter(options: { namespace?: string } = {}): Promise<IRuleDataWriter> {
    const namespace = options.namespace || 'default';
    const cachedWriter = this.writerCache.get(namespace);
    const isWriterCacheEnabled = () => this.writerCacheEnabled;

    // There is no cached writer, so we'll install / update the namespace specific resources now.
    if (!isWriterCacheEnabled() || !cachedWriter) {
      const writerForNamespace = await this.initializeWriter(namespace);
      this.writerCache.set(namespace, writerForNamespace);
      return writerForNamespace;
    } else {
      return cachedWriter;
    }
  }

  private async initializeWriter(namespace: string): Promise<IRuleDataWriter> {
    const isWriteEnabled = () => this.writeEnabled;
    const isWriteInitializationError = () => this.writeInitializationFailed;
    const turnOffWriteDueToInitializationError = () => {
      this.writeEnabled = false;
      this.writeInitializationFailed = true;
    };

    const { indexInfo, resourceInstaller } = this.options;
    const alias = indexInfo.getPrimaryAlias(namespace);

    // Wait until both index and namespace level resources have been installed / updated.
    if (!isWriteEnabled()) {
      this.options.logger.debug(`Writing is disabled, bulk() will not write any data.`);
      throw new RuleDataWriteDisabledError({
        reason: isWriteInitializationError() ? 'error' : 'config',
        registrationContext: indexInfo.indexOptions.registrationContext,
      });
    }

    try {
      const indexLevelResourcesResult = await this.options.waitUntilReadyForWriting;

      if (isLeft(indexLevelResourcesResult)) {
        throw new RuleDataWriterInitializationError(
          'index',
          indexInfo.indexOptions.registrationContext,
          indexLevelResourcesResult.left
        );
      } else {
        try {
          await resourceInstaller.installAndUpdateNamespaceLevelResources(indexInfo, namespace);
          this.clusterClient = indexLevelResourcesResult.right;
        } catch (e) {
          throw new RuleDataWriterInitializationError(
            'namespace',
            indexInfo.indexOptions.registrationContext,
            e
          );
        }
      }
    } catch (error) {
      if (error instanceof RuleDataWriterInitializationError) {
        this.options.logger.error(error);
        this.options.logger.error(
          `The writer for the Rule Data Client for the ${indexInfo.indexOptions.registrationContext} registration context was not initialized properly, bulk() cannot continue, and writing will be disabled.`
        );
        turnOffWriteDueToInitializationError();
      }

      throw error;
    }

    return {
      bulk: async (request: estypes.BulkRequest) => {
        try {
          if (this.clusterClient) {
            const requestWithDefaultParameters = {
              ...request,
              require_alias: true,
              index: alias,
            };

            const response = await this.clusterClient.bulk(requestWithDefaultParameters, {
              meta: true,
            });

            if (response.body.errors) {
              const error = new errors.ResponseError(response);
              this.options.logger.error(error);
            }
            return response;
          } else {
            this.options.logger.debug(`Writing is disabled, bulk() will not write any data.`);
          }
        } catch (error) {
          this.options.logger.error(error);
          throw error;
        }
      },
    };
  }
}
