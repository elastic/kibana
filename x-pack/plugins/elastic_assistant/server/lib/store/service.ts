/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as Boom from '@hapi/boom';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server/plugin';
import { createConcreteWriteIndex, getDataStreamAdapter } from '@kbn/alerting-plugin/server';
import type { CoreSetup, CoreStart, KibanaRequest, Logger } from '@kbn/core/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import { getSpaceIdFromPath } from '@kbn/spaces-plugin/common';
import { once } from 'lodash';
import { DEFAULT_ASSISTANT_INDEX } from '@kbn/security-solution-plugin/common/constants';
import { AIAssistantStoreClient } from './client';
import { AIAssistantResourceNames } from './types';
import { ElasticAssistantPluginStartDependencies } from '../../types';
import { conversationComponentTemplate } from './template';

function getResourceName(resource: string) {
  return `${DEFAULT_ASSISTANT_INDEX}-${resource}`;
}
export class AIAssistantStoreService {
  private readonly core: CoreSetup<ElasticAssistantPluginStartDependencies>;
  private readonly logger: Logger;

  private readonly resourceNames: AIAssistantResourceNames = {
    aliases: getResourceName('conversations'),
    componentTemplate: getResourceName('component-template-conversations'),
    ilmPolicy: getResourceName('ilm-policy-conversations'),
    indexPatterns: getResourceName('conversations*'),
    indexTemplate: getResourceName('index-template-conversations'),
  };

  constructor({
    logger,
    core,
  }: {
    logger: Logger;
    core: CoreSetup<ElasticAssistantPluginStartDependencies>;
  }) {
    this.core = core;
    this.logger = logger;
  }

  init = once(async () => {
    try {
      const [coreStart] = await this.core.getStartServices();

      const esClient = coreStart.elasticsearch.client.asInternalUser;

      await esClient.cluster.putComponentTemplate({
        create: false,
        name: this.resourceNames.componentTemplate,
        template: conversationComponentTemplate,
      });

      await esClient.ilm.putLifecycle({
        name: this.resourceNames.ilmPolicy,
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
        name: this.resourceNames.indexTemplate,
        composed_of: [this.resourceNames.componentTemplate],
        create: false,
        index_patterns: [this.resourceNames.indexPatterns],
        template: {
          settings: {
            number_of_shards: 1,
            auto_expand_replicas: '0-1',
            refresh_interval: '1s',
          },
        },
      });

      const conversationAliasName = this.resourceNames.aliases;

      await createConcreteWriteIndex({
        esClient,
        logger: this.logger,
        totalFieldsLimit: 10000,
        indexPatterns: {
          alias: conversationAliasName,
          pattern: `${conversationAliasName}*`,
          basePattern: `${conversationAliasName}*`,
          name: `${conversationAliasName}-000001`,
          template: this.resourceNames.indexTemplate,
        },
        dataStreamAdapter: getDataStreamAdapter({ useDataStreamForAlerts: false }),
      });

      this.logger.info('Successfully set up index assets');
    } catch (error) {
      console.log('ERROR?!', error);
      this.logger.error(`Failed to initialize service: ${error.message}`);
      this.logger.debug(error);
      throw error;
    }
  });

  async getClient({ request }: { request: KibanaRequest }): Promise<AIAssistantStoreClient> {
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

    return new AIAssistantStoreClient({
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
