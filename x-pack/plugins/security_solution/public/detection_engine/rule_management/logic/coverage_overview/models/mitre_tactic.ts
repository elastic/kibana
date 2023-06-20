/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoverageOverviewRuleData } from './coverage_overview_rule_data';
import type { MitreTechnique } from './mitre_technique';

export interface MitreTactic {
  name: string;
  reference: string;
  techniques: MitreTechnique[];
  enabledRules: CoverageOverviewRuleData[];
  disabledRules: CoverageOverviewRuleData[];
  availableRules: CoverageOverviewRuleData[];
}
