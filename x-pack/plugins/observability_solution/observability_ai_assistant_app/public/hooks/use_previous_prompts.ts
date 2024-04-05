/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq } from 'lodash';
import useLocalStorage from 'react-use/lib/useLocalStorage';

const AI_ASSISTANT_LAST_USED_PROMPT_STORAGE = 'ai-assistant-last-used-prompts';

export function usePreviousPrompts() {
  const [previousPrompts = [], setPreviousPrompts] = useLocalStorage(
    AI_ASSISTANT_LAST_USED_PROMPT_STORAGE,
    [] as string[]
  );

  return {
    previousPrompts,
    addPrompt: (prompt: string) => {
      if (previousPrompts[0] !== prompt) {
        // Keep track of the last 5 prompts
        setPreviousPrompts((previous = []) => uniq([prompt].concat(previous).slice(0, 5)));
      }
    },
  };
}
