/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoverageOverviewRuleActivity } from '../../../../../common/api/detection_engine';
import type { CoverageOverviewResponse } from '../../../../../common/api/detection_engine';
import { buildCoverageOverviewDashboardModel } from './build_coverage_overview_dashboard_model';
import {
  getMockCoverageOverviewSubtechniques,
  getMockCoverageOverviewTactics,
  getMockCoverageOverviewTechniques,
} from '../../model/coverage_overview/__mocks__';

const mockTactics = getMockCoverageOverviewTactics();
const mockTechniques = getMockCoverageOverviewTechniques();
const mockSubtechniques = getMockCoverageOverviewSubtechniques();

describe('buildCoverageOverviewDashboardModel', () => {
  beforeEach(() => {
    jest.mock('../../../../detections/mitre/mitre_tactics_techniques', () => {
      return {
        tactics: mockTactics,
        techniques: mockTechniques,
        subtechniques: mockSubtechniques,
      };
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('correctly maps API response', async () => {
    const mockApiResponse: CoverageOverviewResponse = {
      coverage: {
        TA001: ['test-rule-1'],
        TA002: ['test-rule-1'],
        T001: ['test-rule-1'],
        T002: ['test-rule-1'],
        'T001.001': ['test-rule-1'],
      },
      unmapped_rule_ids: [],
      rules_data: {
        'test-rule-1': {
          name: 'Test rule',
          activity: CoverageOverviewRuleActivity.Enabled,
        },
      },
    };

    const model = await buildCoverageOverviewDashboardModel(mockApiResponse);

    expect(model).toMatchSnapshot();
  });

  it('correctly maps techniques that appear in multiple tactics', async () => {
    const mockApiResponse: CoverageOverviewResponse = {
      coverage: {
        TA001: ['test-rule-1', 'test-rule-2'],
        TA002: ['test-rule-2'],
        T002: ['test-rule-1', 'test-rule-2'],
      },
      unmapped_rule_ids: [],
      rules_data: {
        'test-rule-1': {
          name: 'Test rule',
          activity: CoverageOverviewRuleActivity.Enabled,
        },
        'test-rule-2': {
          name: 'Test rule 2',
          activity: CoverageOverviewRuleActivity.Enabled,
        },
      },
    };

    const model = await buildCoverageOverviewDashboardModel(mockApiResponse);

    expect(model).toMatchSnapshot();
  });
});
