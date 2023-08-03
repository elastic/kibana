/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AssistantTelemetry } from '@kbn/elastic-assistant';
import { useCallback } from 'react';
import { useConversationStore } from '../use_conversation_store';
import { useKibana } from '../../common/lib/kibana';

export const useAssistantTelemetry = (): AssistantTelemetry => {
  const { conversations } = useConversationStore();
  const {
    services: { telemetry },
  } = useKibana();

  const getAnonymizedConversationId = useCallback(
    (id) => {
      const convo = conversations[id] ?? { isDefault: false };
      return convo.isDefault ? id : 'Custom';
    },
    [conversations]
  );

  const reportTelemetry = useCallback(
    ({
      fn,
      params: { conversationId, ...rest },
    }): { fn: keyof AssistantTelemetry; params: AssistantTelemetry[keyof AssistantTelemetry] } =>
      fn({
        ...rest,
        conversationId: getAnonymizedConversationId(conversationId),
      }),
    [getAnonymizedConversationId]
  );

  return {
    reportAssistantInvoked: (params) =>
      reportTelemetry({ fn: telemetry.reportAssistantInvoked, params }),
    reportAssistantMessageSent: (params) =>
      reportTelemetry({ fn: telemetry.reportAssistantMessageSent, params }),
    reportAssistantQuickPrompt: (params) =>
      reportTelemetry({ fn: telemetry.reportAssistantQuickPrompt, params }),
  };
};
