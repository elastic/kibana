/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Conversation } from '@kbn/elastic-assistant';

import {
  ALERT_SUMMARY_CONVERSATION_ID,
  DETECTION_RULES_CONVERSATION_ID,
  EVENT_SUMMARY_CONVERSATION_ID,
  TIMELINE_CONVERSATION_TITLE,
  ELASTIC_AI_ASSISTANT,
  WELCOME_CONVERSATION_TITLE,
  ELASTIC_AI_ASSISTANT_TITLE,
} from './translations';

export const BASE_SECURITY_CONVERSATIONS: Record<string, Conversation> = {
  [ALERT_SUMMARY_CONVERSATION_ID]: {
    id: ALERT_SUMMARY_CONVERSATION_ID,
    isDefault: true,
    messages: [],
    apiConfig: {},
  },
  [DETECTION_RULES_CONVERSATION_ID]: {
    id: DETECTION_RULES_CONVERSATION_ID,
    isDefault: true,
    messages: [],
    apiConfig: {},
  },
  [EVENT_SUMMARY_CONVERSATION_ID]: {
    id: EVENT_SUMMARY_CONVERSATION_ID,
    isDefault: true,
    messages: [],
    apiConfig: {},
  },
  [TIMELINE_CONVERSATION_TITLE]: {
    excludeFromLastConversationStorage: true,
    id: TIMELINE_CONVERSATION_TITLE,
    isDefault: true,
    messages: [],
    apiConfig: {},
  },
  [WELCOME_CONVERSATION_TITLE]: {
    id: WELCOME_CONVERSATION_TITLE,
    isDefault: true,
    theme: {
      title: ELASTIC_AI_ASSISTANT_TITLE,
      titleIcon: 'logoSecurity',
      assistant: {
        name: ELASTIC_AI_ASSISTANT,
        icon: 'logoSecurity',
      },
      system: {
        icon: 'logoElastic',
      },
      user: {},
    },
    messages: [],
    apiConfig: {},
  },
};
