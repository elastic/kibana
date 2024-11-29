/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LICENCE_FOR_MULTIPLE_AGENT_POLICIES } from '../../common/constants';
import { ExperimentalFeaturesService } from '../services';

import { licenseService } from './use_license';

export function useMultipleAgentPolicies() {
  return { canUseMultipleAgentPolicies: canUseMultipleAgentPolicies() };
}

export function canUseMultipleAgentPolicies() {
  const { enableReusableIntegrationPolicies } = ExperimentalFeaturesService.get();

  const hasEnterpriseLicence = licenseService.hasAtLeast(LICENCE_FOR_MULTIPLE_AGENT_POLICIES);

  return Boolean(enableReusableIntegrationPolicies && hasEnterpriseLicence);
}
