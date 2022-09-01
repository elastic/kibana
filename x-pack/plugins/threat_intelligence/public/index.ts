/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ThreatIntelligencePlugin } from './plugin';

export { THREAT_INTELLIGENCE_BASE_PATH } from './common/navigation/constants';

export type { TIPageId } from './common/navigation/types';

export {
  getSecuritySolutionDeepLink,
  getSecuritySolutionLink,
  getSecuritySolutionNavTab,
} from './common/navigation/security_solution_links';

export function plugin() {
  return new ThreatIntelligencePlugin();
}

export type {
  ThreatIntelligencePluginSetup,
  ThreatIntelligencePluginStart,
  SecuritySolutionPluginContext,
} from './types';
