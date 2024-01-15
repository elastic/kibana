/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoverageOverviewRuleActivity } from '../../../../../common/api/detection_engine';
import type { CoverageOverviewMitreTechnique } from './mitre_technique';
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

export const getNumOfCoveredSubtechniques = (
  technique: CoverageOverviewMitreTechnique,
  activity?: CoverageOverviewRuleActivity[]
): number => {
  const coveredSubtechniques = new Set();
  for (const subtechnique of technique.subtechniques) {
    if (
      (!activity || activity.includes(CoverageOverviewRuleActivity.Enabled)) &&
      subtechnique.enabledRules.length
    ) {
      coveredSubtechniques.add(subtechnique.id);
    }

    if (
      (!activity || activity.includes(CoverageOverviewRuleActivity.Disabled)) &&
      subtechnique.disabledRules.length
    ) {
      coveredSubtechniques.add(subtechnique.id);
    }
  }
  return coveredSubtechniques.size;
};
