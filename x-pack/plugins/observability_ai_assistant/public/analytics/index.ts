/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core-lifecycle-browser';

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

export type { ChatFeedback };
export type { InsightFeedback };

const schemas = [chatFeedbackEventSchema, insightFeedbackEventSchema, userSentPromptEventSchema];

export const registerTelemetryEventTypes = (coreSetup: CoreSetup) => {
  schemas.forEach((schema) => {
    coreSetup.analytics.registerEventType<{}>(schema);
  });
};

export const TELEMETRY = {
  [chatFeedbackEventType]: chatFeedbackEventType,
  [insightFeedbackEventType]: insightFeedbackEventType,
  [userSentPromptEventType]: userSentPromptEventType,
} as const;

export type TelemetryType = keyof typeof TELEMETRY;
