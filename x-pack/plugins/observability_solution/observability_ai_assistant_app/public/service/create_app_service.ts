/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ObservabilityAIAssistantService } from '@kbn/observability-ai-assistant-plugin/public';
import type { AuthenticatedUser } from '@kbn/security-plugin/common';
import type { Observable } from 'rxjs';
import type { ILicense } from '@kbn/licensing-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { ObservabilityAIAssistantAppPluginStartDependencies } from '../types';

export type ObservabilityAIAssistantAppService = ObservabilityAIAssistantService & {
  getCurrentUser: () => Promise<AuthenticatedUser>;
  getLicense: () => Observable<ILicense>;
  getLicenseManagementLocator: () => SharePluginStart;
};

export function createAppService({
  pluginsStart,
}: {
  pluginsStart: ObservabilityAIAssistantAppPluginStartDependencies;
}): ObservabilityAIAssistantAppService {
  return {
    ...pluginsStart.observabilityAIAssistant.service,

    getCurrentUser: () => pluginsStart.security.authc.getCurrentUser(),
    getLicense: () => pluginsStart.license.license$,
    getLicenseManagementLocator: () => pluginsStart.share,
  };
}
