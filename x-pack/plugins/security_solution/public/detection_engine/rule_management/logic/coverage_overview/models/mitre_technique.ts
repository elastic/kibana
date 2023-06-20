/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoverageOverviewRuleData } from './rule_data';

export interface CoverageOverviewMitreTechnique {
  name: string;
  reference: string;
  numOfCoveredSubtechniques: number;
  numOfSubtechniques: number;
  enabledRules: CoverageOverviewRuleData[];
  disabledRules: CoverageOverviewRuleData[];
  availableRules: CoverageOverviewRuleData[];
}
