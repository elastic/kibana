/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useMutation, useQuery } from '@tanstack/react-query';
import { getConversationStore, INTERNAL_ASSISTANT_STORE, postConversationStore } from './api';
import type { ConversationStore } from '../use_conversation_store';

interface Props {
  didLocalStorageCheck: boolean;
  defaultValue: ConversationStore;
  stateManager?: boolean;
}

/** Reads and writes settings from local storage */
export const useEsStorage = ({
  defaultValue,
  // hacky property to ensure we are only doing api stuff once
  stateManager = false,
  didLocalStorageCheck,
}: Props): [ConversationStore, (v: ConversationStore) => void] => {
  const [_value, _setValue] = useState<ConversationStore | null>(null);

  const { data: currentStore } = useQuery(
    ['GET', INTERNAL_ASSISTANT_STORE],
    ({ signal }) => getConversationStore(signal),
    {
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      retry: false,
      staleTime: Infinity,
      enabled: stateManager,
    }
  );
  useEffect(() => {
    if (currentStore) _setValue(currentStore);
  }, [currentStore]);

  const { data: updatedStore, mutate: updateConversationStore } = useMutation(
    ['POST', INTERNAL_ASSISTANT_STORE],
    postConversationStore
  );
  const doConversationsExist = useMemo(() => {
    return (
      (currentStore && Object.keys(currentStore).length > 0) ||
      (updatedStore && Object.keys(updatedStore).length > 0)
    );
  }, [currentStore, updatedStore]);

  const didInit = useRef(false);

  useEffect(() => {
    if (!doConversationsExist && stateManager && didLocalStorageCheck && !didInit.current) {
      didInit.current = true;
      updateConversationStore(defaultValue);
    }
  }, [
    didLocalStorageCheck,
    doConversationsExist,
    updateConversationStore,
    stateManager,
    defaultValue,
  ]);

  useEffect(() => {
    if (updatedStore) {
      _setValue(updatedStore);
    }
  }, [updatedStore]);
  const setConversations = useCallback(
    (convos) => {
      updateConversationStore({ ...convos, lobby: true });
    },
    [updateConversationStore]
  );

  return [_value ?? defaultValue, setConversations];
};
