/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createConcreteWriteIndex, getDataStreamAdapter } from '@kbn/alerting-plugin/server';
import type { CoreSetup, Logger } from '@kbn/core/server';
import type { ObservabilityAIAssistantPluginStartDependencies } from '../types';
import { conversationComponentTemplate } from './conversation_component_template';
import { kbComponentTemplate } from './kb_component_template';
import { resourceNames } from '.';
import { ObservabilityAIAssistantConfig } from '../config';

export async function setupConversationAndKbIndexAssets({
  logger,
  core,
  config,
}: {
  logger: Logger;
  core: CoreSetup<ObservabilityAIAssistantPluginStartDependencies>;
  config: ObservabilityAIAssistantConfig;
}): Promise<boolean> {
  if (!config.autoCreateKnowledgeBaseAssets) {
    logger.debug('Skpping setup of index assets because `autoCreateKnowledgeBaseAssets = false`');
    return false;
  }

  try {
    logger.debug('Setting up index assets');
    const [coreStart] = await core.getStartServices();
    const { asInternalUser } = coreStart.elasticsearch.client;

    // Conversations: component template
    await asInternalUser.cluster.putComponentTemplate({
      create: false,
      name: resourceNames.componentTemplate.conversations,
      template: conversationComponentTemplate,
    });

    // Conversations: index template
    await asInternalUser.indices.putIndexTemplate({
      name: resourceNames.indexTemplate.conversations,
      composed_of: [resourceNames.componentTemplate.conversations],
      create: false,
      index_patterns: [resourceNames.indexPatterns.conversations],
      template: {
        settings: {
          number_of_shards: 1,
          auto_expand_replicas: '0-1',
          hidden: true,
        },
      },
    });

    // Conversations: write index
    const conversationAliasName = resourceNames.aliases.conversations;
    await createConcreteWriteIndex({
      esClient: asInternalUser,
      logger,
      totalFieldsLimit: 10000,
      indexPatterns: {
        alias: conversationAliasName,
        pattern: `${conversationAliasName}*`,
        basePattern: `${conversationAliasName}*`,
        name: `${conversationAliasName}-000001`,
        template: resourceNames.indexTemplate.conversations,
      },
      dataStreamAdapter: getDataStreamAdapter({ useDataStreamForAlerts: false }),
    });

    // Knowledge base: component template
    await asInternalUser.cluster.putComponentTemplate({
      create: false,
      name: resourceNames.componentTemplate.kb,
      template: kbComponentTemplate,
    });

    // Knowledge base: index template
    await asInternalUser.indices.putIndexTemplate({
      name: resourceNames.indexTemplate.kb,
      composed_of: [resourceNames.componentTemplate.kb],
      create: false,
      index_patterns: [resourceNames.indexPatterns.kb],
      template: {
        settings: {
          number_of_shards: 1,
          auto_expand_replicas: '0-1',
          hidden: true,
        },
      },
    });

    // Knowledge base: write index
    const kbAliasName = resourceNames.aliases.kb;
    await createConcreteWriteIndex({
      esClient: asInternalUser,
      logger,
      totalFieldsLimit: 10000,
      indexPatterns: {
        alias: kbAliasName,
        pattern: `${kbAliasName}*`,
        basePattern: `${kbAliasName}*`,
        name: `${kbAliasName}-000001`,
        template: resourceNames.indexTemplate.kb,
      },
      dataStreamAdapter: getDataStreamAdapter({ useDataStreamForAlerts: false }),
    });

    logger.info('Successfully set up index assets');
    return true;
  } catch (error) {
    logger.error(`Failed setting up index assets: ${error.message}`);
    logger.debug(error);
    return false;
  }
}
