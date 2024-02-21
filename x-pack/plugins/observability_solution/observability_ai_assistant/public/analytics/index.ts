/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup, AnalyticsServiceStart } from '@kbn/core-analytics-browser';
import type { Message } from '../../common';
import {
  eventType as chatFeedbackEventType,
  chatFeedbackEventSchema,
  ChatFeedback,
} from './schemas/chat_feedback';
import {
  eventType as insightFeedbackEventType,
  insightFeedbackEventSchema,
  InsightFeedback,
} from './schemas/insight_feedback';
import {
  eventType as userSentPromptEventType,
  userSentPromptEventSchema,
} from './schemas/user_sent_prompt';

const schemas = [chatFeedbackEventSchema, insightFeedbackEventSchema, userSentPromptEventSchema];

export const TELEMETRY = {
  [chatFeedbackEventType]: chatFeedbackEventType,
  [insightFeedbackEventType]: insightFeedbackEventType,
  [userSentPromptEventType]: userSentPromptEventType,
} as const;

export type TelemetryEventTypeWithPayload =
  | { type: typeof chatFeedbackEventType; payload: ChatFeedback }
  | { type: typeof insightFeedbackEventType; payload: InsightFeedback }
  | { type: typeof userSentPromptEventType; payload: Message };

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
