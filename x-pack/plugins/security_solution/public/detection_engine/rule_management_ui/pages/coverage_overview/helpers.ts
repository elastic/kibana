/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiPalettePositive } from '@elastic/eui';
import type { CoverageOverviewMitreTactic } from '../../../rule_management/model/coverage_overview/mitre_tactic';
import type { CoverageOverviewMitreTechnique } from '../../../rule_management/model/coverage_overview/mitre_technique';

export const coverageOverviewPalatteColors = euiPalettePositive(5);

export const coverageOverviewPanelWidth = 160;

export const getCoveredTechniques = (tactic: CoverageOverviewMitreTactic) =>
  tactic.techniques.filter((technique) => technique.enabledRules.length !== 0).length;

export const getCoveredSubtechniques = (technique: CoverageOverviewMitreTechnique) =>
  technique.subtechniques.filter((subtechnique) => subtechnique.enabledRules.length !== 0).length;

export const getTechniqueBackgroundColor = (technique: CoverageOverviewMitreTechnique) => {
  if (technique.enabledRules.length >= 10) {
    return coverageOverviewPalatteColors[3];
  } else if (technique.enabledRules.length >= 7) {
    return coverageOverviewPalatteColors[2];
  } else if (technique.enabledRules.length >= 3) {
    return coverageOverviewPalatteColors[1];
  } else if (technique.enabledRules.length >= 1) {
    return coverageOverviewPalatteColors[0];
  }
};
