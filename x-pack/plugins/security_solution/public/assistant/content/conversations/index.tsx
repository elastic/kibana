/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ELASTIC_AI_ASSISTANT_TITLE, WELCOME_CONVERSATION_TITLE } from '@kbn/elastic-assistant';
import type { Conversation } from '@kbn/elastic-assistant';
import { DATA_QUALITY_DASHBOARD_CONVERSATION_ID } from '@kbn/ecs-data-quality-dashboard/impl/data_quality/data_quality_panel/tabs/summary_tab/callout_summary/translations';
import { DETECTION_RULES_CONVERSATION_ID } from '../../../detections/pages/detection_engine/rules/translations';
import {
  ALERT_SUMMARY_CONVERSATION_ID,
  EVENT_SUMMARY_CONVERSATION_ID,
} from '../../../common/components/event_details/translations';
import { ELASTIC_AI_ASSISTANT } from '../../comment_actions/translations';
import { TIMELINE_CONVERSATION_TITLE } from './translations';

export const BASE_SECURITY_CONVERSATIONS: Record<string, Conversation> = {
  [ALERT_SUMMARY_CONVERSATION_ID]: {
    id: ALERT_SUMMARY_CONVERSATION_ID,
    isDefault: true,
    messages: [],
    apiConfig: {},
  },
  [DATA_QUALITY_DASHBOARD_CONVERSATION_ID]: {
    id: DATA_QUALITY_DASHBOARD_CONVERSATION_ID,
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
