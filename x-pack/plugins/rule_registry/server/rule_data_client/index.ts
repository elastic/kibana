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
              (response.body.items?.[0]?.index?.error?.type === 'index_not_found_exception' ||
                response.body.items?.[0]?.index?.error?.type === 'illegal_argument_exception')
            ) {
              return this.createWriteTargetIfNeeded({ namespace }).then(() => {
                return clusterClient.bulk(requestWithDefaultParameters);
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
      // something might have created the index already, that sounds OK
      if (err?.meta?.body?.error?.type === 'resource_already_exists_exception') {
        const { body: existingIndices } = await clusterClient.indices.get({
          index: concreteIndexName,
        });
        if (!existingIndices[concreteIndexName]?.aliases?.[alias]?.is_write_index) {
          throw Error(
            `Attempted to create index: ${concreteIndexName} as the write index for alias: ${alias}, but the index already exists and is not the write index for the alias`
          );
        }
      } else {
        throw err;
      }
    }
  }
}
