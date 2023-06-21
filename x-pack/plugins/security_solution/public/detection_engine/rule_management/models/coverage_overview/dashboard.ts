/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoverageOverviewMitreTactic } from './mitre_tactic';
import type { CoverageOverviewRuleData } from './rule_data';

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
    enabledRules: CoverageOverviewRuleData[];
    disabledRules: CoverageOverviewRuleData[];
    availableRules: CoverageOverviewRuleData[];
  };
  /**
   * Total metrics
   */
  metrics: {
    totalRulesCount: number;
    totalEnabledRulesCount: number;
  };
}
