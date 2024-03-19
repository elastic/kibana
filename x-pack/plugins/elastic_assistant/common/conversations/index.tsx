/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WELCOME_CONVERSATION_TITLE, type Conversation } from '@kbn/elastic-assistant';
import {
  TIMELINE_CONVERSATION_TITLE,
  DETECTION_RULES_CONVERSATION_ID,
  ALERT_SUMMARY_CONVERSATION_ID,
  EVENT_SUMMARY_CONVERSATION_ID,
} from './translations';

export const BASE_CONVERSATIONS: Record<string, Conversation> = {
  [ALERT_SUMMARY_CONVERSATION_ID]: {
    id: '',
    title: ALERT_SUMMARY_CONVERSATION_ID,
    category: 'assistant',
    consumer: 'security',
    isDefault: true,
    messages: [],
    replacements: [],
  },
  [DETECTION_RULES_CONVERSATION_ID]: {
    id: '',
    title: DETECTION_RULES_CONVERSATION_ID,
    category: 'assistant',
    consumer: 'security',
    isDefault: true,
    messages: [],
    replacements: [],
  },
  [EVENT_SUMMARY_CONVERSATION_ID]: {
    id: '',
    title: EVENT_SUMMARY_CONVERSATION_ID,
    category: 'assistant',
    consumer: 'security',
    isDefault: true,
    messages: [],
    replacements: [],
  },
  [TIMELINE_CONVERSATION_TITLE]: {
    excludeFromLastConversationStorage: true,
    id: '',
    title: TIMELINE_CONVERSATION_TITLE,
    category: 'assistant',
    consumer: 'security',
    isDefault: true,
    messages: [],
    replacements: [],
  },
  [WELCOME_CONVERSATION_TITLE]: {
    id: '',
    title: WELCOME_CONVERSATION_TITLE,
    category: 'assistant',
    consumer: 'security',
    isDefault: true,
    messages: [],
    replacements: [],
  },
};
