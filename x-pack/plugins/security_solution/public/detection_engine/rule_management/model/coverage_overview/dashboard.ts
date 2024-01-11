/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoverageOverviewMitreTactic } from './mitre_tactic';
import type { CoverageOverviewRule } from './rule';

/**
 * Coverage overview dashboard domain model
 */
export interface CoverageOverviewDashboard {
  /**
   * MITRE ATT&CK coverage
   */
  mitreTactics: CoverageOverviewMitreTactic[];
  /**
   * Unmapped rules
   */
  unmappedRules: {
    enabledRules: CoverageOverviewRule[];
    disabledRules: CoverageOverviewRule[];
    availableRules: CoverageOverviewRule[];
  };
  /**
   * Total metrics
   */
  metrics: {
    totalRulesCount: number;
    totalEnabledRulesCount: number;
  };
}
