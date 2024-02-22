/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceStart, CoreStart } from '@kbn/core/public';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type { SecurityPluginStart } from '@kbn/security-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import { remove } from 'lodash';
import { ObservabilityAIAssistantScreenContext } from '../../common/types';
import { createCallObservabilityAIAssistantAPI } from '../api';
import type { ChatRegistrationRenderFunction, ObservabilityAIAssistantService } from '../types';

export function createService({
  analytics,
  coreStart,
  enabled,
  licenseStart,
  securityStart,
  shareStart,
}: {
  analytics: AnalyticsServiceStart;
  coreStart: CoreStart;
  enabled: boolean;
  licenseStart: LicensingPluginStart;
  securityStart: SecurityPluginStart;
  shareStart: SharePluginStart;
}): ObservabilityAIAssistantService {
  const client = createCallObservabilityAIAssistantAPI(coreStart);

  const registrations: ChatRegistrationRenderFunction[] = [];

  const screenContexts: ObservabilityAIAssistantScreenContext[] = [];

  return {
    isEnabled: () => {
      return enabled;
    },
    register: (fn) => {
      registrations.push(fn);
    },
    start: async ({ signal }) => {
      const mod = await import('./create_chat_service');
      return await mod.createChatService({ analytics, client, signal, registrations });
    },
    callApi: client,
    getCurrentUser: () => securityStart.authc.getCurrentUser(),
    getLicense: () => licenseStart.license$,
    getLicenseManagementLocator: () => shareStart,
    setScreenContext: (context: ObservabilityAIAssistantScreenContext) => {
      screenContexts.push(context);
      return () => {
        remove(screenContexts, context);
      };
    },
    getScreenContexts: () => {
      return screenContexts;
    },
  };
}
