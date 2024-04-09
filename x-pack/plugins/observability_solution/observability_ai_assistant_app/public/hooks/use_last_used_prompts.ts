/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo } from 'react';
import { noop, uniq } from 'lodash';
import { useKibana } from './use_kibana';

const AI_ASSISTANT_LAST_USED_PROMPT_STORAGE = 'kibana.ai-assistant.last-used-prompts';

export function useLastUsedPrompts() {
  const { storage } = useKibana().services;

  const lastUsedPrompts = useMemo(
    () => (storage.get(AI_ASSISTANT_LAST_USED_PROMPT_STORAGE) as string[]) ?? [],
    [storage]
  );

  useEffect(() => {
    window.addEventListener('local-storage', noop);

    return () => {
      window.removeEventListener('local-storage', noop);
    };
  }, []);

  const addPrompt = useCallback(
    (prompt: string) => {
      storage.set(
        AI_ASSISTANT_LAST_USED_PROMPT_STORAGE,
        uniq([prompt, ...lastUsedPrompts]).slice(0, 5)
      );
      window.dispatchEvent(
        new StorageEvent('local-storage', { key: AI_ASSISTANT_LAST_USED_PROMPT_STORAGE })
      );
    },
    [lastUsedPrompts, storage]
  );

  return {
    lastUsedPrompts,
    addPrompt,
  };
}
