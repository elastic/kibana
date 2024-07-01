/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EventTypeOpts } from '@kbn/core/server';

export const GEN_AI_TOKEN_COUNT_EVENT: EventTypeOpts<{
  actionTypeId: string;
  total_tokens: number;
  prompt_tokens: number;
  completion_tokens: number;
  provider?: string;
}> = {
  eventType: 'gen_ai_token_count',
  schema: {
    actionTypeId: {
      type: 'keyword',
      _meta: {
        description: 'Kibana connector type',
        optional: false,
      },
    },
    total_tokens: {
      type: 'integer',
      _meta: {
        description: 'Total token count',
        optional: false,
      },
    },
    prompt_tokens: {
      type: 'integer',
      _meta: {
        description: 'Prompt token count',
        optional: false,
      },
    },
    completion_tokens: {
      type: 'integer',
      _meta: {
        description: 'Completion token count',
        optional: false,
      },
    },
    provider: {
      type: 'keyword',
      _meta: {
        description: 'OpenAI provider',
        optional: true,
      },
    },
  },
};

export const events: Array<EventTypeOpts<{ [key: string]: unknown }>> = [GEN_AI_TOKEN_COUNT_EVENT];
