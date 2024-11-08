/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EventTypeOpts } from '@kbn/core/server';

export const KNOWLEDGE_BASE_EXECUTION_SUCCESS_EVENT: EventTypeOpts<{
  model: string;
  resourceAccessed?: string;
  resultCount: number;
  responseTime: number;
}> = {
  eventType: 'knowledge_base_execution_success',
  schema: {
    model: {
      type: 'keyword',
      _meta: {
        description: 'ELSER model used to execute the knowledge base query',
      },
    },
    resourceAccessed: {
      type: 'keyword',
      _meta: {
        description: 'Which knowledge base resource was accessed',
        optional: true,
      },
    },
    resultCount: {
      type: 'long',
      _meta: {
        description: 'Number of documents returned from Elasticsearch',
      },
    },
    responseTime: {
      type: 'long',
      _meta: {
        description: `How long it took for Elasticsearch to respond to the knowledge base query`,
      },
    },
  },
};

export const KNOWLEDGE_BASE_EXECUTION_ERROR_EVENT: EventTypeOpts<{
  model: string;
  resourceAccessed?: string;
  errorMessage: string;
}> = {
  eventType: 'knowledge_base_execution_error',
  schema: {
    model: {
      type: 'keyword',
      _meta: {
        description: 'ELSER model used to execute the knowledge base query',
      },
    },
    resourceAccessed: {
      type: 'keyword',
      _meta: {
        description: 'Which knowledge base resource was accessed',
        optional: true,
      },
    },
    errorMessage: {
      type: 'keyword',
      _meta: {
        description: 'Error message from Elasticsearch',
      },
    },
  },
};

export const INVOKE_ASSISTANT_SUCCESS_EVENT: EventTypeOpts<{
  assistantStreamingEnabled: boolean;
  actionTypeId: string;
  isEnabledKnowledgeBase: boolean;
  durationMs: number;
  elasticTools: string[];
  customTools: number;
  toolsInvoked: string[];
  model?: string;
  isOssModel?: boolean;
}> = {
  eventType: 'invoke_assistant_success',
  schema: {
    assistantStreamingEnabled: {
      type: 'boolean',
      _meta: {
        description: 'Is streaming enabled',
      },
    },
    actionTypeId: {
      type: 'keyword',
      _meta: {
        description: 'Kibana action type id',
      },
    },
    model: {
      type: 'keyword',
      _meta: {
        description: 'LLM model',
        optional: true,
      },
    },
    isEnabledKnowledgeBase: {
      type: 'boolean',
      _meta: {
        description: 'Is knowledge base enabled',
      },
    },
    isOssModel: {
      type: 'boolean',
      _meta: {
        description: 'Is OSS model used on the request',
        optional: true,
      },
    },
    durationMs: {
      type: 'float',
      _meta: {
        description: 'The duration of the request.',
      },
    },
    elasticTools: {
      type: 'array',
      items: {
        type: 'keyword',
        _meta: {
          description: 'The tool name',
        },
      },
      _meta: {
        description: 'The Elastic Security tools provided to the agent.',
      },
    },
    customTools: {
      type: 'float',
      _meta: {
        description: 'Custom tools provided to the agent.',
      },
    },
    toolsInvoked: {
      type: 'array',
      items: {
        type: 'keyword',
        _meta: {
          description: 'The tool name',
        },
      },
      _meta: {
        description: 'Tools called by the agent, in order of use.',
      },
    },
  },
};

export const INVOKE_ASSISTANT_ERROR_EVENT: EventTypeOpts<{
  errorMessage: string;
  assistantStreamingEnabled: boolean;
  isEnabledKnowledgeBase: boolean;
  actionTypeId: string;
  model?: string;
}> = {
  eventType: 'invoke_assistant_error',
  schema: {
    errorMessage: {
      type: 'keyword',
      _meta: {
        description: 'Error message from Elasticsearch',
      },
    },
    assistantStreamingEnabled: {
      type: 'boolean',
      _meta: {
        description: 'Is streaming enabled',
      },
    },
    actionTypeId: {
      type: 'keyword',
      _meta: {
        description: 'Kibana action type id',
      },
    },
    model: {
      type: 'keyword',
      _meta: {
        description: 'LLM model',
        optional: true,
      },
    },
    isEnabledKnowledgeBase: {
      type: 'boolean',
      _meta: {
        description: 'Is knowledge base enabled',
      },
    },
  },
};

export const ATTACK_DISCOVERY_SUCCESS_EVENT: EventTypeOpts<{
  actionTypeId: string;
  alertsContextCount: number;
  alertsCount: number;
  configuredAlertsCount: number;
  discoveriesGenerated: number;
  durationMs: number;
  model?: string;
  provider?: string;
}> = {
  eventType: 'attack_discovery_success',
  schema: {
    actionTypeId: {
      type: 'keyword',
      _meta: {
        description: 'Kibana connector type',
        optional: false,
      },
    },
    alertsContextCount: {
      type: 'integer',
      _meta: {
        description: 'Number of alerts sent as context to the LLM',
        optional: false,
      },
    },
    alertsCount: {
      type: 'integer',
      _meta: {
        description: 'Number of unique alerts referenced in the attack discoveries',
        optional: false,
      },
    },
    configuredAlertsCount: {
      type: 'integer',
      _meta: {
        description: 'Number of alerts configured by the user',
        optional: false,
      },
    },
    discoveriesGenerated: {
      type: 'integer',
      _meta: {
        description: 'Quantity of attack discoveries generated',
        optional: false,
      },
    },
    durationMs: {
      type: 'integer',
      _meta: {
        description: 'Duration of request in ms',
        optional: false,
      },
    },
    model: {
      type: 'keyword',
      _meta: {
        description: 'LLM model',
        optional: true,
      },
    },
    provider: {
      type: 'keyword',
      _meta: {
        description: 'OpenAI provider',
        optional: true,
      },
    },
  },
};

export const ATTACK_DISCOVERY_ERROR_EVENT: EventTypeOpts<{
  actionTypeId: string;
  errorMessage: string;
  model?: string;
  provider?: string;
}> = {
  eventType: 'attack_discovery_error',
  schema: {
    actionTypeId: {
      type: 'keyword',
      _meta: {
        description: 'Kibana connector type',
        optional: false,
      },
    },
    errorMessage: {
      type: 'keyword',
      _meta: {
        description: 'Error message from Elasticsearch',
      },
    },

    model: {
      type: 'keyword',
      _meta: {
        description: 'LLM model',
        optional: true,
      },
    },
    provider: {
      type: 'keyword',
      _meta: {
        description: 'OpenAI provider',
        optional: true,
      },
    },
  },
};

export const CREATE_KNOWLEDGE_BASE_ENTRY_SUCCESS_EVENT: EventTypeOpts<{
  entryType: 'index' | 'document';
  required: boolean;
  sharing: 'private' | 'global';
  source?: string;
}> = {
  eventType: 'create_knowledge_base_entry_success',
  schema: {
    entryType: {
      type: 'keyword',
      _meta: {
        description: 'Index entry or document entry',
      },
    },
    sharing: {
      type: 'keyword',
      _meta: {
        description: 'Sharing setting: private or global',
      },
    },
    required: {
      type: 'boolean',
      _meta: {
        description: 'Whether this resource should always be included',
      },
    },
    source: {
      type: 'keyword',
      _meta: {
        description: 'Where the knowledge base document entry was created',
        optional: true,
      },
    },
  },
};

export const CREATE_KNOWLEDGE_BASE_ENTRY_ERROR_EVENT: EventTypeOpts<{
  entryType: 'index' | 'document';
  required: boolean;
  sharing: 'private' | 'global';
  source?: string;
  errorMessage: string;
}> = {
  eventType: 'create_knowledge_base_entry_error',
  schema: {
    entryType: {
      type: 'keyword',
      _meta: {
        description: 'Index entry or document entry',
      },
    },
    sharing: {
      type: 'keyword',
      _meta: {
        description: 'Sharing setting: private or global',
      },
    },
    required: {
      type: 'boolean',
      _meta: {
        description: 'Whether this resource should always be included',
      },
    },
    source: {
      type: 'keyword',
      _meta: {
        description: 'Where the knowledge base document entry was created',
        optional: true,
      },
    },
    errorMessage: {
      type: 'keyword',
      _meta: {
        description: 'Error message',
      },
    },
  },
};

export const events: Array<EventTypeOpts<{ [key: string]: unknown }>> = [
  KNOWLEDGE_BASE_EXECUTION_SUCCESS_EVENT,
  KNOWLEDGE_BASE_EXECUTION_ERROR_EVENT,
  CREATE_KNOWLEDGE_BASE_ENTRY_SUCCESS_EVENT,
  CREATE_KNOWLEDGE_BASE_ENTRY_ERROR_EVENT,
  INVOKE_ASSISTANT_SUCCESS_EVENT,
  INVOKE_ASSISTANT_ERROR_EVENT,
  ATTACK_DISCOVERY_SUCCESS_EVENT,
  ATTACK_DISCOVERY_ERROR_EVENT,
];
