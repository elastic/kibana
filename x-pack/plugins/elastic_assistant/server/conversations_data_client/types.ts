/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MessageRole,
  Provider,
  Reader,
  Replacement,
} from '../schemas/conversations/common_attributes.gen';

export interface SearchEsConversationSchema {
  id: string;
  '@timestamp': string;
  created_at: string;
  title: string;
  messages?: Array<{
    '@timestamp': string;
    content: string;
    reader?: Reader;
    replacements?: Replacement;
    role: MessageRole;
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
    provider?: Provider;
    model?: string;
  };
  is_default?: boolean;
  exclude_from_last_conversation_storage?: boolean;
  replacements?: Replacement;
  user?: {
    id?: string;
    name?: string;
  };
  updated_at?: string;
  namespace: string;
}
