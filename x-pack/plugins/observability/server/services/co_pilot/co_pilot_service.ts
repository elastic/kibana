/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart, KibanaRequest, Logger } from '@kbn/core/server';
import { once } from 'lodash';
import { SecurityPluginStart } from '@kbn/security-plugin/server';
import * as Boom from '@hapi/boom';
import { AzureOpenAIClient } from './azure_openai_client';
import { ObservabilityCoPilotConfig } from './config';
import { CoPilotClient } from './co_pilot_client';
import { OpenAIClient } from './openai_client';
import { CoPilotResourceNames } from './types';

function getResourceName(resource: string) {
  return `.kibana-observability-co-pilot-${resource}`;
}

export class CoPilotService {
  private readonly config: ObservabilityCoPilotConfig;
  private readonly core: CoreSetup;
  private readonly logger: Logger;

  private readonly resourceNames: CoPilotResourceNames = {
    componentTemplate: {
      conversations: getResourceName('component-template-conversations'),
      messages: getResourceName('component-template-messages'),
    },
    concreteIndices: {
      conversations: getResourceName('conversations'),
      messages: getResourceName('messages'),
    },
    indexPatterns: {
      conversations: getResourceName('conversations*'),
      messages: getResourceName('messages*'),
    },
    indexTemplate: {
      conversations: getResourceName('index-template-conversations'),
      messages: getResourceName('index-template-messages'),
    },
    ilmPolicy: {
      conversationsAndMessages: getResourceName('ilm-policy-conversations-messages'),
    },
  };

  constructor({
    config,
    logger,
    core,
  }: {
    config: ObservabilityCoPilotConfig;
    logger: Logger;
    core: CoreSetup;
  }) {
    this.config = config;
    this.core = core;
    this.logger = logger;

    this.init();
  }

  init = once(async () => {
    try {
      const [coreStart] = await this.core.getStartServices();

      const esClient = coreStart.elasticsearch.client.asInternalUser;

      await Promise.all([
        esClient.cluster.putComponentTemplate({
          create: false,
          name: this.resourceNames.componentTemplate.conversations,
          template: {
            mappings: {
              dynamic_templates: [
                {
                  numeric_labels: {
                    path_match: 'numeric_labels.*',
                    mapping: {
                      scaling_factor: 1000000,
                      type: 'scaled_float',
                    },
                  },
                },
              ],
              dynamic: false,
              properties: {
                '@timestamp': {
                  type: 'date',
                },
                labels: {
                  dynamic: true,
                  type: 'object',
                },
                numeric_labels: {
                  dynamic: true,
                  type: 'object',
                },
                user: {
                  properties: {
                    id: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    name: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                conversation: {
                  properties: {
                    id: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    title: {
                      type: 'text',
                    },
                    last_updated: {
                      type: 'date',
                    },
                  },
                },
              },
            },
          },
        }),
        esClient.cluster.putComponentTemplate({
          create: false,
          name: this.resourceNames.componentTemplate.messages,
          template: {
            mappings: {
              dynamic_templates: [
                {
                  numeric_labels: {
                    path_match: 'numeric_labels.*',
                    mapping: {
                      scaling_factor: 1000000,
                      type: 'scaled_float',
                    },
                  },
                },
              ],
              dynamic: false,
              properties: {
                '@timestamp': {
                  type: 'date',
                },
                labels: {
                  dynamic: true,
                  type: 'object',
                },
                numeric_labels: {
                  dynamic: true,
                  type: 'object',
                },
                user: {
                  properties: {
                    id: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    name: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                message: {
                  properties: {
                    content: {
                      type: 'text',
                    },
                    role: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    order: {
                      type: 'byte',
                    },
                  },
                },
                conversation: {
                  properties: {
                    id: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
              },
            },
          },
        }),
      ]);

      await Promise.all([
        esClient.indices.putIndexTemplate({
          name: this.resourceNames.indexTemplate.conversations,
          composed_of: [this.resourceNames.componentTemplate.conversations],
          create: false,
          index_patterns: [this.resourceNames.indexPatterns.conversations],
          template: {
            settings: {
              number_of_shards: 1,
              auto_expand_replicas: '0-1',
            },
          },
        }),
        esClient.indices.putIndexTemplate({
          name: this.resourceNames.indexTemplate.messages,
          composed_of: [this.resourceNames.componentTemplate.messages],
          create: false,
          index_patterns: [this.resourceNames.indexPatterns.messages],
          template: {
            settings: {
              number_of_shards: 1,
              auto_expand_replicas: '0-1',
            },
          },
        }),
      ]);
    } catch (error) {
      this.logger.error(`Failed to initialize CoPilotService: ${error.message}`);
      this.logger.debug(error);
    }
  });

  async getCoPilotClient({ request }: { request: KibanaRequest }) {
    const [_, [coreStart, { security }]] = await Promise.all([
      this.init(),
      this.core.getStartServices() as Promise<
        [CoreStart, { security: SecurityPluginStart }, unknown]
      >,
    ]);

    const user = security.authc.getCurrentUser(request);

    if (!user) {
      throw Boom.forbidden(`User not found for current request`);
    }

    const openAiClient =
      'openAI' in this.config.provider
        ? new OpenAIClient(this.config.provider.openAI)
        : new AzureOpenAIClient(this.config.provider.azureOpenAI);

    return new CoPilotClient({
      openAiClient,
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
