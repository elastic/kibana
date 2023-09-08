/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaServices } from '../../common/lib/kibana';
import type { ConversationStore } from '../use_conversation_store';

export const INTERNAL_ASSISTANT_STORE = `/internal/elastic_assistant/store`;

export const getConversationStore = (abortSignal?: AbortSignal): Promise<ConversationStore> => {
  console.log('called', abortSignal);
  return KibanaServices.get().http.get(INTERNAL_ASSISTANT_STORE, {
    version: '1',
    signal: abortSignal,
  });
};

export const postConversationStore = (
  conversations: ConversationStore,
  abortSignal?: AbortSignal
): Promise<ConversationStore> => {
  console.log('conversaitons', conversations);
  return KibanaServices.get().http.fetch(INTERNAL_ASSISTANT_STORE, {
    method: 'POST',
    version: '1',
    signal: abortSignal,
    body: JSON.stringify(conversations),
  });
};
