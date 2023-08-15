/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { useAssistantTelemetry } from '.';
import { BASE_SECURITY_CONVERSATIONS } from '../content/conversations';
import { createTelemetryServiceMock } from '../../common/lib/telemetry/telemetry_service.mock';

const customId = `My Convo`;
const mockedConversations = {
  ...BASE_SECURITY_CONVERSATIONS,
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
    const { result } = renderHook(() => useAssistantTelemetry());
    trackingFns.forEach((fn) => {
      expect(result.current).toHaveProperty(fn);
    });
  });

  describe.each(trackingFns)('Handles %s id masking', (fn) => {
    it('Should call tracking with appropriate id when tracking is called with an isDefault=true conversation id', () => {
      const { result } = renderHook(() => useAssistantTelemetry());
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
      const { result } = renderHook(() => useAssistantTelemetry());
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
      const { result } = renderHook(() => useAssistantTelemetry());
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
