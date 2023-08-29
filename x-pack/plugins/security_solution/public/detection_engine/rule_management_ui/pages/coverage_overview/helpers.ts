/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSelectableOption } from '@elastic/eui';
import type {
  CoverageOverviewRuleActivity,
  CoverageOverviewRuleSource,
} from '../../../../../common/api/detection_engine';
import type { CoverageOverviewMitreTactic } from '../../../rule_management/model/coverage_overview/mitre_tactic';
import type { CoverageOverviewMitreTechnique } from '../../../rule_management/model/coverage_overview/mitre_technique';
import { coverageOverviewCardColorThresholds } from './constants';

export const getNumOfCoveredTechniques = (tactic: CoverageOverviewMitreTactic): number =>
  tactic.techniques.filter((technique) => technique.enabledRules.length !== 0).length;

export const getNumOfCoveredSubtechniques = (technique: CoverageOverviewMitreTechnique): number =>
  technique.subtechniques.filter((subtechnique) => subtechnique.enabledRules.length !== 0).length;

export const getCardBackgroundColor = (value: number) => {
  for (const { threshold, color } of coverageOverviewCardColorThresholds) {
    if (value >= threshold) {
      return color;
    }
  }
};

export const extractSelected = <
  T extends CoverageOverviewRuleSource | CoverageOverviewRuleActivity
>(
  options: Array<{ checked?: string; label: T }>
): T[] => {
  return options.filter((option) => option.checked === 'on').map((option) => option.label);
};

export const populateSelected = (
  allOptions: EuiSelectableOption[],
  selected: string[]
): EuiSelectableOption[] =>
  allOptions.map((option) =>
    selected.includes(option.label) ? { ...option, checked: 'on' } : option
  );
