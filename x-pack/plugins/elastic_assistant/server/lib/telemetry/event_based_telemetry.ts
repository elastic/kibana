/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EventTypeOpts } from '@kbn/analytics-client';

export const KNOWLEDGE_BASE_EXECUTION_SUCCESS_EVENT: EventTypeOpts<{
  model: string;
  resourceAccessed: string;
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
  resourceAccessed: string;
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
  isEnabledKnowledgeBase: boolean;
  isEnabledRAGAlerts: boolean;
}> = {
  eventType: 'invoke_assistant_success',
  schema: {
    isEnabledKnowledgeBase: {
      type: 'boolean',
      _meta: {
        description: 'Is Knowledge Base enabled',
      },
    },
    isEnabledRAGAlerts: {
      type: 'boolean',
      _meta: {
        description: 'Is RAG Alerts enabled',
      },
    },
  },
};

export const INVOKE_ASSISTANT_ERROR_EVENT: EventTypeOpts<{
  errorMessage: string;
  isEnabledKnowledgeBase: boolean;
  isEnabledRAGAlerts: boolean;
}> = {
  eventType: 'invoke_assistant_error',
  schema: {
    errorMessage: {
      type: 'keyword',
      _meta: {
        description: 'Error message from Elasticsearch',
      },
    },
    isEnabledKnowledgeBase: {
      type: 'boolean',
      _meta: {
        description: 'Is Knowledge Base enabled',
      },
    },
    isEnabledRAGAlerts: {
      type: 'boolean',
      _meta: {
        description: 'Is RAG Alerts enabled',
      },
    },
  },
};

export const events: Array<EventTypeOpts<{ [key: string]: unknown }>> = [
  KNOWLEDGE_BASE_EXECUTION_SUCCESS_EVENT,
  KNOWLEDGE_BASE_EXECUTION_ERROR_EVENT,
  INVOKE_ASSISTANT_SUCCESS_EVENT,
  INVOKE_ASSISTANT_ERROR_EVENT,
];
