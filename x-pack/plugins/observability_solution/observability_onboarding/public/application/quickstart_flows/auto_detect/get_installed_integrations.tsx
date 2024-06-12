/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InstallIntegrationsStepPayload } from '../../../../server/routes/types';
import type { ObservabilityOnboardingFlow } from '../../../../server/saved_objects/observability_onboarding_status';
import type {
  Integration,
  RegistryIntegration,
  CustomIntegration,
} from '../../../../server/routes/types';

export function getInstalledIntegrations(
  data: Pick<ObservabilityOnboardingFlow, 'progress'> | undefined
): Integration[] {
  return (data?.progress['install-integrations']?.payload as InstallIntegrationsStepPayload) ?? [];
}

export function isRegistryIntegration(
  integration: Integration
): integration is RegistryIntegration {
  return integration.installSource === 'registry';
}

export function isCustomIntegration(integration: Integration): integration is CustomIntegration {
  return integration.installSource === 'custom';
}
