/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import { SecurityPluginStart } from '@kbn/security-plugin/public';
import { createCallObservabilityAIAssistantAPI } from '../api';
import type { ChatRegistrationFunction, ObservabilityAIAssistantService } from '../types';
import { createChatService } from './create_chat_service';

export function createService({
  coreStart,
  securityStart,
  enabled,
}: {
  coreStart: CoreStart;
  securityStart: SecurityPluginStart;
  enabled: boolean;
}): ObservabilityAIAssistantService & { register: (fn: ChatRegistrationFunction) => void } {
  const client = createCallObservabilityAIAssistantAPI(coreStart);

  const registrations: ChatRegistrationFunction[] = [];

  return {
    isEnabled: () => {
      return enabled;
    },
    register: (fn) => {
      registrations.push(fn);
    },
    start: async ({ signal }) => {
      return await createChatService({ client, signal, registrations });
    },

    callApi: client,
    getCurrentUser: () => securityStart.authc.getCurrentUser(),
  };
}
