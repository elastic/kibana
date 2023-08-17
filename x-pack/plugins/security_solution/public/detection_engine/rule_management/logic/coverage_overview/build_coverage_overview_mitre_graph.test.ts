/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildCoverageOverviewMitreGraph } from './build_coverage_overview_mitre_graph';

describe('buildCoverageOverviewModel', () => {
  it('builds domain model', () => {
    const tactics = [
      {
        name: 'Tactic 1',
        id: 'TA001',
        reference: 'https://some-link/TA001',
      },
      {
        name: 'Tactic 2',
        id: 'TA002',
        reference: 'https://some-link/TA002',
      },
    ];
    const techniques = [
      {
        name: 'Technique 1',
        id: 'T001',
        reference: 'https://some-link/T001',
        tactics: ['tactic-1'],
      },
      {
        name: 'Technique 2',
        id: 'T002',
        reference: 'https://some-link/T002',
        tactics: ['tactic-1', 'tactic-2'],
      },
    ];
    const subtechniques = [
      {
        name: 'Subtechnique 1',
        id: 'T001.001',
        reference: 'https://some-link/T001/001',
        tactics: ['tactic-1'],
        techniqueId: 'T001',
      },
      {
        name: 'Subtechnique 2',
        id: 'T001.002',
        reference: 'https://some-link/T001/002',
        tactics: ['tactic-1'],
        techniqueId: 'T001',
      },
    ];

    const model = buildCoverageOverviewMitreGraph(tactics, techniques, subtechniques);

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
