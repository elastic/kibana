/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type AssistantTelemetry } from '@kbn/elastic-assistant';
import { useCallback } from 'react';
import { useKibana } from '../../common/lib/kibana';
import { useBaseConversations } from '../use_conversation_store';

export const useAssistantTelemetry = (): AssistantTelemetry => {
  const {
    services: { telemetry },
  } = useKibana();
  const baseConversations = useBaseConversations();

  const getAnonymizedConversationTitle = useCallback(
    async (title) => {
      // With persistent storage for conversation replacing id to title, because id is UUID now
      // and doesn't make any value for telemetry tracking
      return baseConversations[title] ? title : 'Custom';
    },
    [baseConversations]
  );

  const reportTelemetry = useCallback(
    async ({
      fn,
      params: { conversationId, ...rest },
    }): Promise<{
      fn: keyof AssistantTelemetry;
      params: AssistantTelemetry[keyof AssistantTelemetry];
    }> => {
      console.log('rest???', rest);
      return fn({
        ...rest,
        conversationId: await getAnonymizedConversationTitle(conversationId),
      });
    },
    [getAnonymizedConversationTitle]
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
