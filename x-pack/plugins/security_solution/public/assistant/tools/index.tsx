/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Conversation } from '@kbn/elastic-assistant';
import { BASE_SECURITY_CONVERSATIONS } from '../content/conversations';

export const getBaseConversations = (): Record<string, Conversation> => {
  return BASE_SECURITY_CONVERSATIONS;
};
