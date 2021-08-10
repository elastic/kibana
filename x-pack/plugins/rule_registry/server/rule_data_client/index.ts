/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ResponseError } from '@elastic/elasticsearch/lib/errors';
import { IndexPatternsFetcher } from '../../../../../src/plugins/data/server';
import { RuleDataWriteDisabledError } from '../rule_data_plugin_service/errors';
import {
  IRuleDataClient,
  RuleDataClientConstructorOptions,
  RuleDataReader,
  RuleDataWriter,
} from './types';

function getNamespacedAlias(options: { alias: string; namespace?: string }) {
  return [options.alias, options.namespace].filter(Boolean).join('-');
}

export class RuleDataClient implements IRuleDataClient {
  constructor(private readonly options: RuleDataClientConstructorOptions) {}

  private async getClusterClient() {
    await this.options.ready();
    return await this.options.getClusterClient();
  }

  isWriteEnabled(): boolean {
    return this.options.isWriteEnabled;
  }

  getReader(options: { namespace?: string } = {}): RuleDataReader {
    const index = `${[this.options.alias, options.namespace].filter(Boolean).join('-')}*`;

    return {
      search: async (request) => {
        const clusterClient = await this.getClusterClient();

        const { body } = (await clusterClient.search({
          ...request,
          index,
        })) as { body: any };

        return body;
      },
      getDynamicIndexPattern: async () => {
        const clusterClient = await this.getClusterClient();
        const indexPatternsFetcher = new IndexPatternsFetcher(clusterClient);

        try {
          const fields = await indexPatternsFetcher.getFieldsForWildcard({
            pattern: index,
          });

          return {
            fields,
            timeFieldName: '@timestamp',
            title: index,
          };
        } catch (err) {
          if (err.output?.payload?.code === 'no_matching_indices') {
            return {
              fields: [],
              timeFieldName: '@timestamp',
              title: index,
            };
          }
          throw err;
        }
      },
    };
  }

  getWriter(options: { namespace?: string } = {}): RuleDataWriter {
    const { namespace } = options;
    const isWriteEnabled = this.isWriteEnabled();
    const alias = getNamespacedAlias({ alias: this.options.alias, namespace });

    return {
      bulk: async (request) => {
        if (!isWriteEnabled) {
          throw new RuleDataWriteDisabledError();
        }

        const clusterClient = await this.getClusterClient();

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
              return this.createWriteTargetIfNeeded({ namespace }).then(() => {
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

  async createWriteTargetIfNeeded({ namespace }: { namespace?: string }) {
    const alias = getNamespacedAlias({ alias: this.options.alias, namespace });

    const clusterClient = await this.getClusterClient();

    try {
      // When a new namespace is created we expect getAlias to return a 404 error,
      // we'll catch it below and continue on. A non-404 error is a real problem so we throw.

      // It's critical that we specify *both* the index pattern and alias in this request. The alias prevents the
      // request from finding other namespaces that could match the -* part of the index pattern
      // (see https://github.com/elastic/kibana/issues/107704). The index pattern prevents the request from
      // finding legacy .siem-signals indices that we add the alias to for backwards compatibility reasons. Together,
      // the index pattern and alias should ensure that we retrieve only the "new" backing indices for this
      // particular alias.
      const { body: aliases } = await clusterClient.indices.getAlias({
        index: `${alias}-*`,
        name: alias,
      });

      // If we find backing indices for the alias here, we shouldn't be making a new concrete index -
      // either one of the indices is the write index so we return early because we don't need a new write target,
      // or none of them are the write index so we'll throw an error because one of the existing indices should have
      // been the write target
      if (
        Object.values(aliases).some((aliasesObject) => aliasesObject.aliases[alias].is_write_index)
      ) {
        return;
      } else {
        throw new Error(
          `Indices matching pattern ${alias}-* exist but none are set as the write index for alias ${alias}`
        );
      }
    } catch (err) {
      // 404 is expected if the alerts-as-data index hasn't been created yet
      if (err.statusCode !== 404) {
        throw err;
      }
    }

    const concreteIndexName = `${alias}-000001`;

    try {
      await clusterClient.indices.create({
        index: concreteIndexName,
        body: {
          aliases: {
            [alias]: {
              is_write_index: true,
            },
          },
        },
      });
    } catch (err) {
      // If the index already exists and it's the write index for the alias,
      // something else created it so suppress the error. If it's not the write
      // index, that's bad, throw an error.
      if (err?.meta?.body?.error?.type === 'resource_already_exists_exception') {
        const { body: existingIndices } = await clusterClient.indices.get({
          index: concreteIndexName,
        });
        if (!existingIndices[concreteIndexName]?.aliases?.[alias]?.is_write_index) {
          throw new Error(
            `Attempted to create index: ${concreteIndexName} as the write index for alias: ${alias}, but the index already exists and is not the write index for the alias`
          );
        }
      } else {
        throw err;
      }
    }
  }
}
