/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import stringify from 'json-stable-stringify';
import type { CoreSetup, CoreStart, KibanaRequest, Logger } from '@kbn/core/server';
import { once } from 'lodash';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import * as Boom from '@hapi/boom';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server/plugin';
import { getSpaceIdFromPath } from '@kbn/spaces-plugin/common';
import fnv from 'fnv-plus';
import { errors } from '@elastic/elasticsearch';
import type { ObservabilityAIAssistantResourceNames } from './types';
import { conversationComponentTemplate } from './conversation_component_template';
import type { IObservabilityAIAssistantClient, IObservabilityAIAssistantService } from './types';
import { ObservabilityAIAssistantClient } from './client';

function getResourceName(resource: string) {
  return `.kibana-observability-ai-assistant-${resource}`;
}

export class ObservabilityAIAssistantService implements IObservabilityAIAssistantService {
  private readonly core: CoreSetup;
  private readonly logger: Logger;

  private readonly resourceNames: ObservabilityAIAssistantResourceNames = {
    componentTemplate: {
      conversations: getResourceName('component-template-conversations'),
    },
    aliases: {
      conversations: getResourceName('conversations'),
    },
    indexPatterns: {
      conversations: getResourceName('conversations*'),
    },
    indexTemplate: {
      conversations: getResourceName('index-template-conversations'),
    },
    ilmPolicy: {
      conversations: getResourceName('ilm-policy-conversations'),
    },
  };

  constructor({ logger, core }: { logger: Logger; core: CoreSetup }) {
    this.core = core;
    this.logger = logger;

    this.init();
  }

  init = once(async () => {
    try {
      const [coreStart] = await this.core.getStartServices();

      const esClient = coreStart.elasticsearch.client.asInternalUser;

      const versionHash = fnv.fast1a64(stringify(conversationComponentTemplate));

      await esClient.cluster.putComponentTemplate({
        create: false,
        name: this.resourceNames.componentTemplate.conversations,
        template: {
          ...conversationComponentTemplate,
          mappings: {
            _meta: {
              version: versionHash,
            },
            ...conversationComponentTemplate.mappings,
          },
        },
      });

      await esClient.ilm.putLifecycle({
        name: this.resourceNames.ilmPolicy.conversations,
        policy: {
          phases: {
            hot: {
              min_age: '0s',
              actions: {
                rollover: {
                  max_age: '90d',
                  max_primary_shard_size: '50gb',
                },
              },
            },
          },
        },
      });

      await esClient.indices.putIndexTemplate({
        name: this.resourceNames.indexTemplate.conversations,
        composed_of: [this.resourceNames.componentTemplate.conversations],
        create: false,
        index_patterns: [this.resourceNames.indexPatterns.conversations],
        template: {
          settings: {
            number_of_shards: 1,
            auto_expand_replicas: '0-1',
            refresh_interval: '1s',
          },
        },
      });

      const aliasName = this.resourceNames.aliases.conversations;

      const aliasExists = await esClient.indices.existsAlias({
        name: aliasName,
      });

      if (!aliasExists) {
        const firstIndexName = `${this.resourceNames.aliases.conversations}-000001`;
        try {
          await esClient.indices.create({
            index: firstIndexName,
            aliases: {
              [aliasName]: {
                is_write_index: true,
              },
            },
          });
        } catch (err) {
          const indexAlreadyExists =
            (err as errors.ResponseError)?.body?.error?.type ===
            'resource_already_exists_exception';

          if (!indexAlreadyExists) {
            throw err;
          }
        }
      }

      const indicesForAlias = await esClient.indices.get({
        index: aliasName,
      });

      const writeIndexName = Object.keys(indicesForAlias).find((indexName) => {
        if (indicesForAlias[indexName]!.aliases?.[aliasName].is_write_index) {
          return true;
        }
        return false;
      });

      if (!writeIndexName) {
        throw new Error(`Expected write index for ${aliasName}, but none was found`);
      }

      const writeIndex = indicesForAlias[writeIndexName];

      if (writeIndex.mappings?._meta?.version !== versionHash) {
        await esClient.indices.rollover({
          alias: aliasName,
          conditions: {
            min_docs: 0,
          },
        });
      }
    } catch (error) {
      this.logger.error(`Failed to initialize service: ${error.message}`);
      this.logger.debug(error);
      throw error;
    }
  });

  async getClient({
    request,
  }: {
    request: KibanaRequest;
  }): Promise<IObservabilityAIAssistantClient> {
    const [_, [coreStart, plugins]] = await Promise.all([
      this.init(),
      this.core.getStartServices() as Promise<
        [CoreStart, { security: SecurityPluginStart; actions: ActionsPluginStart }, unknown]
      >,
    ]);

    const user = plugins.security.authc.getCurrentUser(request);

    if (!user) {
      throw Boom.forbidden(`User not found for current request`);
    }

    const basePath = coreStart.http.basePath.get(request);

    const { spaceId } = getSpaceIdFromPath(basePath, coreStart.http.basePath.serverBasePath);

    return new ObservabilityAIAssistantClient({
      actionsClient: await plugins.actions.getActionsClientWithRequest(request),
      namespace: spaceId,
      esClient: coreStart.elasticsearch.client.asInternalUser,
      resources: this.resourceNames,
      logger: this.logger,
      user: {
        id: user.profile_uid,
        name: user.username,
      },
    });
  }
}
