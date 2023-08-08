/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoverageOverviewDashboard } from '../dashboard';
import type { CoverageOverviewMitreSubTechnique } from '../mitre_subtechnique';
import type { CoverageOverviewMitreTactic } from '../mitre_tactic';
import type { CoverageOverviewMitreTechnique } from '../mitre_technique';
import type { CoverageOverviewRule } from '../rule';

export const getMockCoverageOverviewRule = (): CoverageOverviewRule => ({
  id: 'rule-id',
  name: 'test rule',
});

const mockCoverageOverviewRules = {
  enabledRules: [getMockCoverageOverviewRule()],
  disabledRules: [getMockCoverageOverviewRule()],
  availableRules: [getMockCoverageOverviewRule()],
};

export const getMockCoverageOverviewMitreTactic = (): CoverageOverviewMitreTactic => ({
  id: 'tactic-id',
  name: 'test tactic',
  reference: 'http://test-link',
  techniques: [],
  ...mockCoverageOverviewRules,
});

export const getMockCoverageOverviewMitreTechnique = (): CoverageOverviewMitreTechnique => ({
  id: 'technique-id',
  name: 'test technique',
  reference: 'http://test-link',
  subtechniques: [],
  ...mockCoverageOverviewRules,
});

export const getMockCoverageOverviewMitreSubTechnique = (): CoverageOverviewMitreSubTechnique => ({
  id: 'sub-technique-id',
  name: 'test sub-technique',
  reference: 'http://test-link',
  ...mockCoverageOverviewRules,
});

export const getMockCoverageOverviewDashboard = (): CoverageOverviewDashboard => ({
  mitreTactics: [getMockCoverageOverviewMitreTactic()],
  unmappedRules: {
    enabledRules: [],
    disabledRules: [],
    availableRules: [],
  },
  metrics: {
    totalRulesCount: 3,
    totalEnabledRulesCount: 1,
  },
});
