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
