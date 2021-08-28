/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ResponseError } from '@elastic/elasticsearch/lib/errors';
import { Either, isLeft } from 'fp-ts/lib/Either';

import { ElasticsearchClient } from 'kibana/server';
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
}

export type WaitResult = Either<Error, ElasticsearchClient>;

export class RuleDataClient implements IRuleDataClient {
  constructor(private readonly options: ConstructorOptions) {}

  public get indexName(): string {
    return this.options.indexInfo.baseName;
  }

  public isWriteEnabled(): boolean {
    return this.options.isWriteEnabled;
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
    const { indexInfo, resourceInstaller } = this.options;

    const namespace = options.namespace || 'default';
    const alias = indexInfo.getPrimaryAlias(namespace);
    const isWriteEnabled = this.isWriteEnabled();

    const waitUntilReady = async () => {
      const result = await this.options.waitUntilReadyForWriting;
      if (isLeft(result)) {
        throw result.left;
      } else {
        return result.right;
      }
    };

    return {
      bulk: async (request) => {
        if (!isWriteEnabled) {
          throw new RuleDataWriteDisabledError();
        }

        const clusterClient = await waitUntilReady();

        const requestWithDefaultParameters = {
          ...request,
          require_alias: true,
          index: alias,
        };

        return clusterClient.bulk(requestWithDefaultParameters).then((response) => {
          if (response.body.errors) {
            if (
              response.body.items.length > 0 &&
              (response.body.items.every(
                (item) => item.index?.error?.type === 'index_not_found_exception'
              ) ||
                response.body.items.every(
                  (item) => item.index?.error?.type === 'illegal_argument_exception'
                ))
            ) {
              return resourceInstaller
                .installNamespaceLevelResources(indexInfo, namespace)
                .then(() => {
                  return clusterClient.bulk(requestWithDefaultParameters).then((retryResponse) => {
                    if (retryResponse.body.errors) {
                      throw new ResponseError(retryResponse);
                    }
                    return retryResponse;
                  });
                });
            }
            const error = new ResponseError(response);
            throw error;
          }
          return response;
        });
      },
    };
  }
}
