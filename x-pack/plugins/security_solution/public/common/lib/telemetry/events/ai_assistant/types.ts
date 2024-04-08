/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RootSchema } from '@kbn/analytics-client';
import type { TelemetryEventTypes } from '../../constants';

export interface ReportAssistantInvokedParams {
  conversationId: string;
  invokedBy: string;
}

export interface ReportAssistantMessageSentParams {
  conversationId: string;
  role: string;
  isEnabledKnowledgeBase: boolean;
  isEnabledRAGAlerts: boolean;
}

export interface ReportAssistantQuickPromptParams {
  conversationId: string;
  promptTitle: string;
}

export interface ReportAssistantSettingToggledParams {
  isEnabledKnowledgeBase?: boolean;
  isEnabledRAGAlerts?: boolean;
  assistantStreamingEnabled?: boolean;
}

export type ReportAssistantTelemetryEventParams =
  | ReportAssistantInvokedParams
  | ReportAssistantMessageSentParams
  | ReportAssistantSettingToggledParams
  | ReportAssistantQuickPromptParams;

export type AssistantTelemetryEvent =
  | {
      eventType: TelemetryEventTypes.AssistantInvoked;
      schema: RootSchema<ReportAssistantInvokedParams>;
    }
  | {
      eventType: TelemetryEventTypes.AssistantSettingToggled;
      schema: RootSchema<ReportAssistantSettingToggledParams>;
    }
  | {
      eventType: TelemetryEventTypes.AssistantMessageSent;
      schema: RootSchema<ReportAssistantMessageSentParams>;
    }
  | {
      eventType: TelemetryEventTypes.AssistantQuickPrompt;
      schema: RootSchema<ReportAssistantQuickPromptParams>;
    };
