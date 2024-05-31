/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useRef } from 'react';
import { v4 } from 'uuid';

// Regenerate the key only when the id changes, except after
// creating the conversation. Ideally this happens by adding
// state to the current route, but I'm not keen on adding
// the concept of state to the router, due to a mismatch
// between router.link() and router.push(). So, this is a
// pretty gross workaround for persisting a key under some
// conditions.

export function useConversationKey(conversationId: string | undefined) {
  const keyRef = useRef(v4());
  const conversationIdRef = useRef(conversationId);

  if (conversationIdRef.current !== conversationId) {
    keyRef.current = v4();
  }

  conversationIdRef.current = conversationId;

  return {
    updateConversationIdInPlace: (nextConversationId: string) => {
      conversationIdRef.current = nextConversationId;
    },
    key: keyRef.current,
  };
}
