/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ELASTIC_SECURITY_ASSISTANT_TITLE,
  WELCOME_CONVERSATION_TITLE,
} from '@kbn/elastic-assistant/impl/assistant/use_conversation/translations';
import type { Conversation } from '@kbn/elastic-assistant';
import {
  WELCOME_GENERAL,
  WELCOME_GENERAL_2,
  WELCOME_GENERAL_3,
} from '@kbn/elastic-assistant/impl/content/prompts/welcome/translations';
import { DATA_QUALITY_DASHBOARD_CONVERSATION_ID } from '@kbn/ecs-data-quality-dashboard/impl/data_quality/data_quality_panel/tabs/summary_tab/callout_summary/translations';
import { DETECTION_RULES_CONVERSATION_ID } from '../../../detections/pages/detection_engine/rules/translations';
import {
  ALERT_SUMMARY_CONVERSATION_ID,
  EVENT_SUMMARY_CONVERSATION_ID,
} from '../../../common/components/event_details/translations';
import { ELASTIC_SECURITY_ASSISTANT } from '../../comment_actions/translations';

export const BASE_SECURITY_CONVERSATIONS: Record<string, Conversation> = {
  [ALERT_SUMMARY_CONVERSATION_ID]: {
    id: ALERT_SUMMARY_CONVERSATION_ID,
    messages: [],
    apiConfig: {},
  },
  [DATA_QUALITY_DASHBOARD_CONVERSATION_ID]: {
    id: DATA_QUALITY_DASHBOARD_CONVERSATION_ID,
    messages: [],
    apiConfig: {},
  },
  [DETECTION_RULES_CONVERSATION_ID]: {
    id: DETECTION_RULES_CONVERSATION_ID,
    messages: [],
    apiConfig: {},
  },
  [EVENT_SUMMARY_CONVERSATION_ID]: {
    id: EVENT_SUMMARY_CONVERSATION_ID,
    messages: [],
    apiConfig: {},
  },
  [WELCOME_CONVERSATION_TITLE]: {
    id: WELCOME_CONVERSATION_TITLE,
    theme: {
      title: ELASTIC_SECURITY_ASSISTANT_TITLE,
      titleIcon: 'logoSecurity',
      assistant: {
        name: ELASTIC_SECURITY_ASSISTANT,
        icon: 'logoSecurity',
      },
      system: {
        icon: 'logoElastic',
      },
      user: {},
    },
    messages: [
      {
        role: 'assistant',
        content: WELCOME_GENERAL,
        timestamp: '',
        presentation: {
          delay: 2 * 1000,
          stream: true,
        },
      },
      {
        role: 'assistant',
        content: WELCOME_GENERAL_2,
        timestamp: '',
        presentation: {
          delay: 1000,
          stream: true,
        },
      },
      {
        role: 'assistant',
        content: WELCOME_GENERAL_3,
        timestamp: '',
        presentation: {
          delay: 1000,
          stream: true,
        },
      },
    ],
    apiConfig: {},
  },
};
