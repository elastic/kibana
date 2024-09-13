/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getMockCoverageOverviewTactics,
  getMockCoverageOverviewTechniques,
  getMockCoverageOverviewSubtechniques,
} from '../../model/coverage_overview/__mocks__';
import { buildCoverageOverviewMitreGraph } from './build_coverage_overview_mitre_graph';

describe('buildCoverageOverviewModel', () => {
  it('builds domain model', () => {
    const mockTactics = getMockCoverageOverviewTactics();
    const mockTechniques = getMockCoverageOverviewTechniques();
    const mockSubtechniques = getMockCoverageOverviewSubtechniques();
    const model = buildCoverageOverviewMitreGraph(mockTactics, mockTechniques, mockSubtechniques);

    expect(model).toEqual([
      {
        id: 'TA001',
        name: 'Tactic 1',
        reference: 'https://some-link/TA001',
        techniques: [
          {
            id: 'T001',
            name: 'Technique 1',
            reference: 'https://some-link/T001',
            subtechniques: [
              {
                id: 'T001.001',
                name: 'Subtechnique 1',
                reference: 'https://some-link/T001/001',
                enabledRules: [],
                disabledRules: [],
                availableRules: [],
              },
              {
                id: 'T001.002',
                name: 'Subtechnique 2',
                reference: 'https://some-link/T001/002',
                enabledRules: [],
                disabledRules: [],
                availableRules: [],
              },
            ],
            enabledRules: [],
            disabledRules: [],
            availableRules: [],
          },
          {
            id: 'T002',
            name: 'Technique 2',
            reference: 'https://some-link/T002',
            subtechniques: [],
            enabledRules: [],
            disabledRules: [],
            availableRules: [],
          },
        ],
        enabledRules: [],
        disabledRules: [],
        availableRules: [],
      },
      {
        id: 'TA002',
        name: 'Tactic 2',
        reference: 'https://some-link/TA002',
        techniques: [
          {
            id: 'T002',
            name: 'Technique 2',
            reference: 'https://some-link/T002',
            subtechniques: [],
            enabledRules: [],
            disabledRules: [],
            availableRules: [],
          },
        ],
        enabledRules: [],
        disabledRules: [],
        availableRules: [],
      },
    ]);
  });
});
