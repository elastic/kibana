/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface SearchEsConversationSchema {
  id: string;
  '@timestamp': string;
  created_at: string;
  title: string;
  messages?: Array<{
    '@timestamp': string;
    content: string;
    reader?: string | undefined;
    replacements?: unknown;
    role: 'user' | 'assistant' | 'system';
    is_error?: boolean;
    presentation?: {
      delay?: number;
      stream?: boolean;
    };
    trace_data?: {
      transaction_id?: string;
      trace_id?: string;
    };
  }>;
  api_config?: {
    connector_id?: string;
    connector_type_title?: string;
    default_system_prompt_id?: string;
    provider?: 'OpenAI' | 'Azure OpenAI';
    model?: string;
  };
  is_default?: boolean;
  exclude_from_last_conversation_storage?: boolean;
  replacements?: unknown;
  user?: {
    id?: string;
    name?: string;
  };
  updated_at?: string;
  namespace: string;
}
