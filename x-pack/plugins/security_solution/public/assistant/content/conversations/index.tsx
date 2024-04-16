/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WELCOME_CONVERSATION_TITLE } from '@kbn/elastic-assistant';
import type { Conversation } from '@kbn/elastic-assistant';
import { DATA_QUALITY_DASHBOARD_CONVERSATION_ID } from '@kbn/ecs-data-quality-dashboard/impl/data_quality/data_quality_panel/tabs/summary_tab/callout_summary/translations';
import { DETECTION_RULES_CONVERSATION_ID } from '../../../detections/pages/detection_engine/rules/translations';
import {
  ALERT_SUMMARY_CONVERSATION_ID,
  EVENT_SUMMARY_CONVERSATION_ID,
} from '../../../common/components/event_details/translations';
import { TIMELINE_CONVERSATION_TITLE } from './translations';

export const BASE_SECURITY_CONVERSATIONS: Record<string, Conversation> = {
  [ALERT_SUMMARY_CONVERSATION_ID]: {
    id: '',
    title: ALERT_SUMMARY_CONVERSATION_ID,
    category: 'assistant',
    isDefault: true,
    messages: [],
    replacements: {},
  },
  [DATA_QUALITY_DASHBOARD_CONVERSATION_ID]: {
    id: '',
    title: DATA_QUALITY_DASHBOARD_CONVERSATION_ID,
    category: 'assistant',
    isDefault: true,
    messages: [],
    replacements: {},
  },
  [DETECTION_RULES_CONVERSATION_ID]: {
    id: '',
    title: DETECTION_RULES_CONVERSATION_ID,
    category: 'assistant',
    isDefault: true,
    messages: [],
    replacements: {},
  },
  [EVENT_SUMMARY_CONVERSATION_ID]: {
    id: '',
    title: EVENT_SUMMARY_CONVERSATION_ID,
    category: 'assistant',
    isDefault: true,
    messages: [],
    replacements: {},
  },
  [TIMELINE_CONVERSATION_TITLE]: {
    excludeFromLastConversationStorage: true,
    id: '',
    title: TIMELINE_CONVERSATION_TITLE,
    category: 'assistant',
    isDefault: true,
    messages: [],
    replacements: {},
  },
  [WELCOME_CONVERSATION_TITLE]: {
    id: '',
    title: WELCOME_CONVERSATION_TITLE,
    category: 'assistant',
    isDefault: true,
    messages: [],
    replacements: {},
  },
};
