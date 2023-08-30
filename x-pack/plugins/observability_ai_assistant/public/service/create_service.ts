/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type { SecurityPluginStart } from '@kbn/security-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import { createCallObservabilityAIAssistantAPI } from '../api';
import { createChatService } from './create_chat_service';
import type { ChatRegistrationFunction, ObservabilityAIAssistantService } from '../types';

export function createService({
  coreStart,
  enabled,
  licenseStart,
  securityStart,
  shareStart,
}: {
  coreStart: CoreStart;
  enabled: boolean;
  licenseStart: LicensingPluginStart;
  securityStart: SecurityPluginStart;
  shareStart: SharePluginStart;
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
    getLicense: () => licenseStart.license$,
    getLicenseManagementLocator: () => shareStart,
  };
}
