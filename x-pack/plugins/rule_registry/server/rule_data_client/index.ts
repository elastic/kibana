/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeMapping } from '@elastic/elasticsearch/api/types';
import { ResponseError } from '@elastic/elasticsearch/lib/errors';
import { IndexPatternsFetcher } from 'src/plugins/data/server';
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
    const { clusterClient } = await this.options.ready();
    return clusterClient;
  }

  getReader(): RuleDataReader {
    return {
      search: async (request) => {
        const clusterClient = await this.getClusterClient();

        return clusterClient.search({
          ...request,
          index: this.options.alias,
        }) as Promise<any>;
      },
      getDynamicIndexPattern: async (pattern: string = this.options.alias) => {
        const clusterClient = await this.getClusterClient();
        const indexPatternsFetcher = new IndexPatternsFetcher(clusterClient);

        const fields = await indexPatternsFetcher.getFieldsForWildcard({
          pattern,
        });

        return {
          fields,
          timeFieldName: '@timestamp',
          title: pattern,
        };
      },
    };
  }

  getWriter(options: { namespace?: string } = {}): RuleDataWriter {
    const { namespace } = options;
    const alias = getNamespacedAlias({ alias: this.options.alias, namespace });
    return {
      bulk: async (request) => {
        const clusterClient = await this.getClusterClient();

        const requestWithDefaultParameters = {
          ...request,
          require_alias: true,
          index: alias,
        };

        return clusterClient.bulk(requestWithDefaultParameters).catch((error) => {
          if (error instanceof ResponseError && error.name === 'index_not_found_exception') {
            return this.createOrUpdateWriteTarget({ namespace }).then(() => {
              return clusterClient.bulk(requestWithDefaultParameters);
            });
          }
          throw error;
        });
      },
    };
  }

  async createOrUpdateWriteTarget({ namespace }: { namespace?: string }) {
    const alias = getNamespacedAlias({ alias: this.options.alias, namespace });

    const clusterClient = await this.getClusterClient();

    const { body: aliasExists } = await clusterClient.indices.existsAlias({
      name: alias,
    });

    const concreteIndexName = `${alias}-000001`;

    if (!aliasExists) {
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
    }

    const { body: simulateResponse } = await clusterClient.transport.request({
      method: 'POST',
      path: `/_index_template/_simulate_index/${concreteIndexName}`,
    });

    const mappings: TypeMapping = simulateResponse.mappings;

    await clusterClient.indices.putMapping({ index: `${alias}*`, body: mappings });
  }
}
