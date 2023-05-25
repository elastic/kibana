/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Conversation } from '@kbn/elastic-assistant';
import { BASE_CONVERSATIONS } from '@kbn/elastic-assistant';

import { useLocalStorage } from '../../common/components/local_storage';
import { LOCAL_STORAGE_KEY } from '../helpers';

export interface UseConversationStore {
  conversations: Record<string, Conversation>;
  setConversations: React.Dispatch<React.SetStateAction<Record<string, Conversation>>>;
}

export const useConversationStore = (): UseConversationStore => {
  const [conversations, setConversations] = useLocalStorage<Record<string, Conversation>>({
    defaultValue: BASE_CONVERSATIONS,
    key: LOCAL_STORAGE_KEY,
    isInvalidDefault: (valueFromStorage) => {
      return !valueFromStorage;
    },
  });

  return {
    conversations,
    setConversations,
  };
};
