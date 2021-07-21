/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndicesPutIndexTemplateRequest } from '@elastic/elasticsearch/api/types';
import { ResponseError } from '@elastic/elasticsearch/lib/errors';
import { IndexPatternsFetcher } from '../../../../../src/plugins/data/server';
import { DEFAULT_ILM_POLICY_ID } from '../../common/assets';
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
              response.body.items?.[0]?.index?.error?.type === 'index_not_found_exception'
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

  createNamespacedIndexTemplate(primaryNamespacedAlias: string, secondaryNamespacedAlias?: string): IndicesPutIndexTemplateRequest {
    return {
      name: primaryNamespacedAlias,
      body: {
        index_patterns: [`${primaryNamespacedAlias}*`],
        composed_of: [
          ...this.options.componentTemplateNames,
        ],
        template: {
          aliases: secondaryNamespacedAlias != null ? {
            [secondaryNamespacedAlias]: {
              is_write_index: false,
            }
          } : undefined,
          settings: {
            'index.lifecycle': {
              name: DEFAULT_ILM_POLICY_ID,
              // TODO: fix the types in the ES package, they don't include rollover_alias???
              // @ts-expect-error
              rollover_alias: primaryNamespacedAlias,
            },
          },
        },
      }
    };
  }

  async createWriteTargetIfNeeded({ namespace }: { namespace?: string }) {
    const namespacedAlias = getNamespacedAlias({ alias: this.options.alias, namespace });

    const clusterClient = await this.getClusterClient();
    const secondaryNamespacedAlias = this.options.secondaryAlias != null ? 
      getNamespacedAlias({ alias: this.options.secondaryAlias, namespace })
      : undefined;
    const template = this.createNamespacedIndexTemplate(namespacedAlias, secondaryNamespacedAlias);
    // TODO: need a way to update this template if/when we decide to make changes to the 
    // built in index template. Probably do it as part of updateIndexMappingsForAsset?
    // (Before upgrading any indices, find and upgrade all namespaced index templates - component templates
    // will already have been upgraded by solutions or rule registry, in the case of technical/ECS templates)
    // With the current structure, it's tricky because the index template creation
    // depends on both the namespace and secondary alias, both of which are not currently available
    // to updateIndexMappingsForAsset. We can make the secondary alias available since
    // it's known at plugin startup time, but
    // the namespace values can really only come from the existing templates that we're trying to update
    // - maybe we want to store the namespace as a _meta field on the index template for easy retrieval
    await clusterClient.indices.putIndexTemplate(template);
    const { body: aliasExists } = await clusterClient.indices.existsAlias({
      name: namespacedAlias,
    });

    const concreteIndexName = `${namespacedAlias}-000001`;

    if (!aliasExists) {
      try {
        await clusterClient.indices.create({
          index: concreteIndexName,
          body: {
            aliases: {
              [namespacedAlias]: {
                is_write_index: true,
              },
            },
          },
        });
      } catch (err) {
        // something might have created the index already, that sounds OK
        if (err?.meta?.body?.error?.type !== 'resource_already_exists_exception') {
          throw err;
        }
      }
    }
  }
}
