/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoverageOverviewRule } from './rule';

export interface CoverageOverviewMitreSubTechnique {
  id: string;
  name: string;
  /**
   * An url leading to the subtechnique's page
   */
  reference: string;
  enabledRules: CoverageOverviewRule[];
  disabledRules: CoverageOverviewRule[];
  availableRules: CoverageOverviewRule[];
}
