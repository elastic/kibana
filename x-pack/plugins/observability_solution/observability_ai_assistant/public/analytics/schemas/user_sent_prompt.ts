/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EventTypeOpts } from '@kbn/analytics-client';
import type { Message } from '../../../common';
import { messageSchema } from './common';

export const eventType = 'observability_ai_assistant_user_sent_prompt_in_chat';
export const userSentPromptEventSchema: EventTypeOpts<Message> = {
  eventType,
  schema: messageSchema,
};
