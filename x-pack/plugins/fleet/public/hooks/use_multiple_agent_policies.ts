/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExperimentalFeaturesService } from '../services';

import { useLicense } from './use_license';

export const LICENCE_FOR_MULTIPLE_AGENT_POLICIES = 'enterprise';

export function useMultipleAgentPolicies() {
  const licenseService = useLicense();
  const { enableReusableIntegrationPolicies } = ExperimentalFeaturesService.get();

  const hasEnterpriseLicence = licenseService.hasAtLeast(LICENCE_FOR_MULTIPLE_AGENT_POLICIES);

  const canUseMultipleAgentPolicies = enableReusableIntegrationPolicies && hasEnterpriseLicence;

  return { canUseMultipleAgentPolicies };
}
