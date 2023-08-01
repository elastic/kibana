/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoverageOverviewMitreTactic } from '../../../rule_management/model/coverage_overview/mitre_tactic';
import type { CoverageOverviewMitreTechnique } from '../../../rule_management/model/coverage_overview/mitre_technique';
import { coverageOverviewPaletteColors } from './constants';

export const getNumOfCoveredTechniques = (tactic: CoverageOverviewMitreTactic): number =>
  tactic.techniques.filter((technique) => technique.enabledRules.length !== 0).length;

export const getNumOfCoveredSubtechniques = (technique: CoverageOverviewMitreTechnique): number =>
  technique.subtechniques.filter((subtechnique) => subtechnique.enabledRules.length !== 0).length;

export const getTechniqueBackgroundColor = (technique: CoverageOverviewMitreTechnique) => {
  if (technique.enabledRules.length >= 10) {
    return coverageOverviewPaletteColors[3];
  } else if (technique.enabledRules.length >= 7) {
    return coverageOverviewPaletteColors[2];
  } else if (technique.enabledRules.length >= 3) {
    return coverageOverviewPaletteColors[1];
  } else if (technique.enabledRules.length >= 1) {
    return coverageOverviewPaletteColors[0];
  }
};
