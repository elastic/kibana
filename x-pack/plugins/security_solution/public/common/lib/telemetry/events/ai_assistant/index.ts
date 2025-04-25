/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TelemetryEvent } from '../../types';
import { TelemetryEventTypes } from '../../constants';

export const assistantInvokedEvent: TelemetryEvent = {
  eventType: TelemetryEventTypes.AssistantInvoked,
  schema: {
    conversationId: {
      type: 'keyword',
      _meta: {
        description: 'Active conversation ID',
        optional: false,
      },
    },
    invokedBy: {
      type: 'keyword',
      _meta: {
        description: 'Invocation method',
        optional: false,
      },
    },
  },
};

export const assistantMessageSentEvent: TelemetryEvent = {
  eventType: TelemetryEventTypes.AssistantMessageSent,
  schema: {
    conversationId: {
      type: 'keyword',
      _meta: {
        description: 'Active conversation ID',
        optional: false,
      },
    },
    role: {
      type: 'keyword',
      _meta: {
        description: 'Conversation role',
        optional: false,
      },
    },
    actionTypeId: {
      type: 'keyword',
      _meta: {
        description: 'Kibana connector type',
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
    isEnabledKnowledgeBase: {
      type: 'boolean',
      _meta: {
        description: 'Is knowledge base enabled',
      },
    },
  },
};

export const assistantQuickPrompt: TelemetryEvent = {
  eventType: TelemetryEventTypes.AssistantQuickPrompt,
  schema: {
    conversationId: {
      type: 'keyword',
      _meta: {
        description: 'Active conversation ID',
        optional: false,
      },
    },
    promptTitle: {
      type: 'keyword',
      _meta: {
        description: 'Title of the quick prompt',
        optional: false,
      },
    },
  },
};

export const assistantSettingToggledEvent: TelemetryEvent = {
  eventType: TelemetryEventTypes.AssistantSettingToggled,
  schema: {
    alertsCountUpdated: {
      type: 'boolean',
      _meta: {
        description: 'Did alerts count update',
        optional: true,
      },
    },
    assistantStreamingEnabled: {
      type: 'boolean',
      _meta: {
        description: 'Is streaming enabled',
        optional: true,
      },
    },
  },
};
