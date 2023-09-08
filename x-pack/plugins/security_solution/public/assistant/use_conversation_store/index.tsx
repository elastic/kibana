/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Conversation } from '@kbn/elastic-assistant';

import { useEsStorage } from '../use_es_store';
import { useLocalStorage } from '../../common/components/local_storage';
import { LOCAL_STORAGE_KEY } from '../helpers';
import { BASE_SECURITY_CONVERSATIONS } from '../content/conversations';

export type ConversationStore = Record<string, Conversation>;

export interface UseConversationStore {
  conversations: ConversationStore;
  setConversations: React.Dispatch<React.SetStateAction<ConversationStore>>;
}

export const useConversationStore = (stateManager = false): UseConversationStore => {
  const [conversations, _, didLocalStorageCheck] = useLocalStorage<ConversationStore>({
    defaultValue: BASE_SECURITY_CONVERSATIONS,
    key: LOCAL_STORAGE_KEY,
    isInvalidDefault: (valueFromStorage) => {
      return !valueFromStorage;
    },
  });
  const [fromStorageConvos, setConversations] = useEsStorage({
    defaultValue: conversations,
    stateManager,
    didLocalStorageCheck,
  });

  return {
    conversations: fromStorageConvos,
    setConversations,
  };
};
