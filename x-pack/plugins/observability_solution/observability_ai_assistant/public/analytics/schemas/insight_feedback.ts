/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EventTypeOpts } from '@kbn/analytics-client';
import type { Message } from '../../../common';
import type { Feedback } from '../../components/buttons/feedback_buttons';
import { ObservabilityAIAssistantTelemetryEventType } from '../telemetry_event_type';
import { messageSchema } from './common';

export interface InsightFeedback {
  feedback: Feedback;
  message: Message;
}

export const insightFeedbackEventSchema: EventTypeOpts<InsightFeedback> = {
  eventType: ObservabilityAIAssistantTelemetryEventType.InsightFeedback,
  schema: {
    feedback: {
      type: 'text',
      _meta: {
        description: 'Whether the user has deemed this response useful or not',
      },
    },
    message: {
      properties: messageSchema,
    },
  },
};
