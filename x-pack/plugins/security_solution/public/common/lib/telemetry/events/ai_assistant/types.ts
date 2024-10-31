/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RootSchema } from '@kbn/core/public';

export enum AssistantEventTypes {
  AssistantInvoked = 'Assistant Invoked',
  AssistantMessageSent = 'Assistant Message Sent',
  AssistantQuickPrompt = 'Assistant Quick Prompt',
  AssistantSettingToggled = 'Assistant Setting Toggled',
}

export interface ReportAssistantInvokedParams {
  conversationId: string;
  invokedBy: string;
}

export interface ReportAssistantMessageSentParams {
  conversationId: string;
  role: string;
  actionTypeId: string;
  provider?: string;
  model?: string;
  isEnabledKnowledgeBase: boolean;
}

export interface ReportAssistantQuickPromptParams {
  conversationId: string;
  promptTitle: string;
}

export interface ReportAssistantSettingToggledParams {
  alertsCountUpdated?: boolean;
  assistantStreamingEnabled?: boolean;
}

export type AssistantEventTypeData = {
  [K in AssistantEventTypes]: K extends AssistantEventTypes.AssistantInvoked
    ? ReportAssistantInvokedParams
    : K extends AssistantEventTypes.AssistantMessageSent
    ? ReportAssistantMessageSentParams
    : K extends AssistantEventTypes.AssistantQuickPrompt
    ? ReportAssistantQuickPromptParams
    : K extends AssistantEventTypes.AssistantSettingToggled
    ? ReportAssistantSettingToggledParams
    : never;
};

export type AssistantTelemetryEvent =
  | {
      eventType: AssistantEventTypes.AssistantInvoked;
      schema: RootSchema<ReportAssistantInvokedParams>;
    }
  | {
      eventType: AssistantEventTypes.AssistantSettingToggled;
      schema: RootSchema<ReportAssistantSettingToggledParams>;
    }
  | {
      eventType: AssistantEventTypes.AssistantMessageSent;
      schema: RootSchema<ReportAssistantMessageSentParams>;
    }
  | {
      eventType: AssistantEventTypes.AssistantQuickPrompt;
      schema: RootSchema<ReportAssistantQuickPromptParams>;
    };
