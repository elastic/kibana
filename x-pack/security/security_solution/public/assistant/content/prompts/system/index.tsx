/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Prompt } from '@kbn/elastic-assistant';
import {
  DEFAULT_SYSTEM_PROMPT_NAME,
  DEFAULT_SYSTEM_PROMPT_NON_I18N,
  SUPERHERO_SYSTEM_PROMPT_NAME,
  SUPERHERO_SYSTEM_PROMPT_NON_I18N,
} from './translations';

/**
 * Base System Prompts for Security Solution.
 */
export const BASE_SECURITY_SYSTEM_PROMPTS: Prompt[] = [
  {
    id: 'default-system-prompt',
    content: DEFAULT_SYSTEM_PROMPT_NON_I18N,
    name: DEFAULT_SYSTEM_PROMPT_NAME,
    promptType: 'system',
    isDefault: true,
    isNewConversationDefault: true,
  },
  {
    id: 'CB9FA555-B59F-4F71-AFF9-8A891AC5BC28',
    content: SUPERHERO_SYSTEM_PROMPT_NON_I18N,
    name: SUPERHERO_SYSTEM_PROMPT_NAME,
    promptType: 'system',
    isDefault: true,
  },
];
