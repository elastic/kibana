/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { renderHook } from '@testing-library/react-hooks';
import { useConversationStore } from '.';
import { useLinkAuthorized } from '../../common/links';
import { useKibana as mockUseKibana } from '../../common/lib/kibana/__mocks__';
import {
  ALERT_SUMMARY_CONVERSATION_ID,
  EVENT_SUMMARY_CONVERSATION_ID,
} from '../../common/components/event_details/translations';
import { DATA_QUALITY_DASHBOARD_CONVERSATION_ID } from '@kbn/ecs-data-quality-dashboard/impl/data_quality/data_quality_panel/tabs/summary_tab/callout_summary/translations';
import { DETECTION_RULES_CONVERSATION_ID } from '../../detections/pages/detection_engine/rules/translations';
import { TIMELINE_CONVERSATION_TITLE } from '../content/conversations/translations';
import { ELASTIC_AI_ASSISTANT_TITLE, WELCOME_CONVERSATION_TITLE } from '@kbn/elastic-assistant';
import { ELASTIC_AI_ASSISTANT } from '../comment_actions/translations';

jest.mock('../../common/links', () => ({
  useLinkAuthorized: jest.fn(),
}));

const mockedUseKibana = {
  ...mockUseKibana(),
  services: {
    ...mockUseKibana().services,
    storage: {
      ...mockUseKibana().services.storage,
      get: jest.fn(),
      set: jest.fn(),
    },
  },
};

jest.mock('../../common/lib/kibana', () => {
  return {
    useKibana: () => mockedUseKibana,
  };
});

describe('useConversationStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return conversations with "Data Quality dashboard" conversation', () => {
    (useLinkAuthorized as jest.Mock).mockReturnValue(true);
    const { result } = renderHook(() => useConversationStore());

    expect(result.current.conversations).toEqual(
      expect.objectContaining({
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
      })
    );
  });

  it('should return conversations Without "Data Quality dashboard" conversation', () => {
    (useLinkAuthorized as jest.Mock).mockReturnValue(false);
    const { result } = renderHook(() => useConversationStore());

    expect(result.current.conversations).toEqual(
      expect.objectContaining({
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
      })
    );
  });
});
