/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup, AnalyticsServiceStart } from '@kbn/core-analytics-browser';
import type { Message } from '../../common';
import { chatFeedbackEventSchema, ChatFeedback } from './schemas/chat_feedback';
import { insightFeedbackEventSchema, InsightFeedback } from './schemas/insight_feedback';
import { userSentPromptEventSchema } from './schemas/user_sent_prompt';
import { ObservabilityAIAssistantTelemetryEventType } from './telemetry_event_type';

const schemas = [chatFeedbackEventSchema, insightFeedbackEventSchema, userSentPromptEventSchema];

export type TelemetryEventTypeWithPayload =
  | { type: ObservabilityAIAssistantTelemetryEventType.ChatFeedback; payload: ChatFeedback }
  | { type: ObservabilityAIAssistantTelemetryEventType.InsightFeedback; payload: InsightFeedback }
  | { type: ObservabilityAIAssistantTelemetryEventType.UserSentPromptInChat; payload: Message };

export const registerTelemetryEventTypes = (analytics: AnalyticsServiceSetup) => {
  schemas.forEach((schema) => {
    analytics.registerEventType<{}>(schema);
  });
};

export function sendEvent(
  analytics: AnalyticsServiceStart,
  eventType: TelemetryEventTypeWithPayload
): void {
  analytics.reportEvent(eventType.type, eventType.payload);
}
