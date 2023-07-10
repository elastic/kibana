/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoverageOverviewRule } from './rule';

export interface CoverageOverviewMitreTechnique {
  name: string;
  /**
   * An url leading to the technique's page
   */
  reference: string;
  /**
   * A number of covered subtechniques (having at least one enabled rule associated with it)
   */
  numOfCoveredSubtechniques: number;
  /**
   * A total number of subtechniques associated with this technique
   */
  numOfSubtechniques: number;
  enabledRules: CoverageOverviewRule[];
  disabledRules: CoverageOverviewRule[];
  availableRules: CoverageOverviewRule[];
}
