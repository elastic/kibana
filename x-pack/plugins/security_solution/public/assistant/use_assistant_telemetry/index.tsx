/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Conversation } from '@kbn/elastic-assistant';
import { getConversationById, type AssistantTelemetry } from '@kbn/elastic-assistant';
import { useCallback } from 'react';
import { useKibana } from '../../common/lib/kibana';
import { useBaseConversations } from '../use_conversation_store';

export const useAssistantTelemetry = (): AssistantTelemetry => {
  const {
    services: { telemetry, http },
  } = useKibana();
  const baseConversations = useBaseConversations();

  const getAnonymizedConversationId = useCallback(
    async (id) => {
      const conversation = baseConversations[id]
        ? baseConversations[id]
        : await getConversationById({ http, id });
      const convo = (conversation as Conversation) ?? { isDefault: false };
      return convo.isDefault ? id : 'Custom';
    },
    [baseConversations, http]
  );

  const reportTelemetry = useCallback(
    async ({
      fn,
      params: { conversationId, ...rest },
    }): Promise<{
      fn: keyof AssistantTelemetry;
      params: AssistantTelemetry[keyof AssistantTelemetry];
    }> =>
      fn({
        ...rest,
        conversationId: await getAnonymizedConversationId(conversationId),
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
    reportAssistantSettingToggled: (params) => telemetry.reportAssistantSettingToggled(params),
  };
};
