/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { useAssistantTelemetry } from '.';
import { createTelemetryServiceMock } from '../../common/lib/telemetry/telemetry_service.mock';
import { ELASTIC_AI_ASSISTANT_TITLE, WELCOME_CONVERSATION_TITLE } from '@kbn/elastic-assistant';
import type { Conversation } from '@kbn/elastic-assistant';
import { DATA_QUALITY_DASHBOARD_CONVERSATION_ID } from '@kbn/ecs-data-quality-dashboard/impl/data_quality/data_quality_panel/tabs/summary_tab/callout_summary/translations';
import {
  ALERT_SUMMARY_CONVERSATION_ID,
  EVENT_SUMMARY_CONVERSATION_ID,
} from '../../common/components/event_details/translations';
import { DETECTION_RULES_CONVERSATION_ID } from '../../detections/pages/detection_engine/rules/translations';
import { ELASTIC_AI_ASSISTANT } from '../comment_actions/translations';
import { TIMELINE_TITLE as TIMELINE_CONVERSATION_TITLE } from '../../timelines/components/timeline/tabs_content/translations';

export const MOCK_BASE_SECURITY_CONVERSATIONS: Record<string, Conversation> = {
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

const customId = `My Convo`;
const mockedConversations = {
  ...MOCK_BASE_SECURITY_CONVERSATIONS,
  [customId]: {
    id: customId,
    apiConfig: {},
    messages: [],
  },
};
const reportAssistantInvoked = jest.fn();
const reportAssistantMessageSent = jest.fn();
const reportAssistantQuickPrompt = jest.fn();
const mockedTelemetry = {
  ...createTelemetryServiceMock(),
  reportAssistantInvoked,
  reportAssistantMessageSent,
  reportAssistantQuickPrompt,
};

jest.mock('../use_conversation_store', () => {
  return {
    useConversationStore: () => ({
      conversations: mockedConversations,
    }),
  };
});

jest.mock('../../common/lib/kibana', () => {
  const original = jest.requireActual('../../common/lib/kibana');

  return {
    ...original,
    useKibana: () => ({
      services: {
        telemetry: mockedTelemetry,
      },
    }),
  };
});

const trackingFns = [
  'reportAssistantInvoked',
  'reportAssistantMessageSent',
  'reportAssistantQuickPrompt',
];

describe('useAssistantTelemetry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('should return the expected telemetry object with tracking functions', () => {
    const { result } = renderHook(() => useAssistantTelemetry(MOCK_BASE_SECURITY_CONVERSATIONS));
    trackingFns.forEach((fn) => {
      expect(result.current).toHaveProperty(fn);
    });
  });

  describe.each(trackingFns)('Handles %s id masking', (fn) => {
    it('Should call tracking with appropriate id when tracking is called with an isDefault=true conversation id', () => {
      const { result } = renderHook(() => useAssistantTelemetry(MOCK_BASE_SECURITY_CONVERSATIONS));
      const validId = Object.keys(mockedConversations)[0];
      // @ts-ignore
      const trackingFn = result.current[fn];
      trackingFn({ conversationId: validId, invokedBy: 'shortcut' });
      // @ts-ignore
      const trackingMockedFn = mockedTelemetry[fn];
      expect(trackingMockedFn).toHaveBeenCalledWith({
        conversationId: validId,
        invokedBy: 'shortcut',
      });
    });

    it('Should call tracking with "Custom" id when tracking is called with an isDefault=false conversation id', () => {
      const { result } = renderHook(() => useAssistantTelemetry(MOCK_BASE_SECURITY_CONVERSATIONS));
      // @ts-ignore
      const trackingFn = result.current[fn];
      trackingFn({ conversationId: customId, invokedBy: 'shortcut' });
      // @ts-ignore
      const trackingMockedFn = mockedTelemetry[fn];
      expect(trackingMockedFn).toHaveBeenCalledWith({
        conversationId: 'Custom',
        invokedBy: 'shortcut',
      });
    });

    it('Should call tracking with "Custom" id when tracking is called with an unknown conversation id', () => {
      const { result } = renderHook(() => useAssistantTelemetry(MOCK_BASE_SECURITY_CONVERSATIONS));
      // @ts-ignore
      const trackingFn = result.current[fn];
      trackingFn({ conversationId: '123', invokedBy: 'shortcut' });
      // @ts-ignore
      const trackingMockedFn = mockedTelemetry[fn];
      expect(trackingMockedFn).toHaveBeenCalledWith({
        conversationId: 'Custom',
        invokedBy: 'shortcut',
      });
    });
  });
});
