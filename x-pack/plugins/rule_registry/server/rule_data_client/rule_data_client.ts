/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ResponseError } from '@elastic/elasticsearch/lib/errors';
import { ValidFeatureId } from '@kbn/rule-data-utils/target/alerts_as_data_rbac';

import { ElasticsearchClient } from 'kibana/server';
import { IndexPatternsFetcher } from '../../../../../src/plugins/data/server';

import { RuleDataWriteDisabledError } from '../rule_data_plugin_service/errors';
import { IndexNames } from '../rule_data_plugin_service/index_names';
import { IndexOptions } from '../rule_data_plugin_service/index_options';
import { ResourceInstaller } from '../rule_data_plugin_service/resource_installer';
import { IRuleDataClient, IRuleDataReader, IRuleDataWriter } from './types';

/**
 * The purpose of the `feature` param is to force the user to update
 * the data structure which contains the mapping of consumers to alerts
 * as data indices. The idea is it is typed such that it forces the
 * user to go to the code and modify it. At least until a better system
 * is put in place or we move the alerts as data client out of rule registry.
 */
interface ConstructorOptions {
  feature: ValidFeatureId;
  indexNames: IndexNames;
  indexOptions: IndexOptions;
  resourceInstaller: ResourceInstaller;
  isWriteEnabled: boolean;
  waitUntilIndexIsReady: () => Promise<{ clusterClient: ElasticsearchClient }>;
}

export class RuleDataClient implements IRuleDataClient {
  constructor(private readonly options: ConstructorOptions) {}

  public get indexName(): string {
    return this.options.indexNames.baseName;
  }

  public isWriteEnabled(): boolean {
    return this.options.isWriteEnabled;
  }

  public getReader(options: { namespace?: string } = {}): IRuleDataReader {
    const { indexNames, waitUntilIndexIsReady } = this.options;

    // Because namespace is user-defined in general, by default we want to
    // ignore namespace when reading, and search over all the namespaces.
    const namespace = options.namespace || '*';
    const indexAliasOrPattern = indexNames.getPrimaryAlias(namespace);

    return {
      search: async (request) => {
        const { clusterClient } = await waitUntilIndexIsReady();

        const { body } = (await clusterClient.search({
          ...request,
          index: indexAliasOrPattern,
        })) as { body: any };

        return body;
      },

      getDynamicIndexPattern: async () => {
        const { clusterClient } = await waitUntilIndexIsReady();
        const indexPatternsFetcher = new IndexPatternsFetcher(clusterClient);

        try {
          const fields = await indexPatternsFetcher.getFieldsForWildcard({
            pattern: indexAliasOrPattern,
          });

          return {
            fields,
            timeFieldName: '@timestamp',
            title: indexAliasOrPattern,
          };
        } catch (err) {
          if (err.output?.payload?.code === 'no_matching_indices') {
            return {
              fields: [],
              timeFieldName: '@timestamp',
              title: indexAliasOrPattern,
            };
          }
          throw err;
        }
      },
    };
  }

  public getWriter(options: { namespace?: string } = {}): IRuleDataWriter {
    const { indexNames, indexOptions, resourceInstaller, waitUntilIndexIsReady } = this.options;

    const namespace = options.namespace || 'default';
    const alias = indexNames.getPrimaryAlias(namespace);
    const isWriteEnabled = this.isWriteEnabled();

    return {
      bulk: async (request) => {
        if (!isWriteEnabled) {
          throw new RuleDataWriteDisabledError();
        }

        const { clusterClient } = await waitUntilIndexIsReady();

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
                .createWriteTargetIfNeeded(indexOptions, indexNames, namespace)
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
