/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoverageOverviewRuleActivity } from '../../../../../common/api/detection_engine';
import type { CoverageOverviewMitreTactic } from './mitre_tactic';
import type { CoverageOverviewMitreTechnique } from './mitre_technique';
import { getNumOfCoveredTechniques, getTotalRuleCount } from './mitre_technique';
import {
  getMockCoverageOverviewMitreTactic,
  getMockCoverageOverviewMitreTechnique,
} from './__mocks__';

describe('mitre_technique', () => {
  describe('getTotalRuleCount', () => {
    it('returns count of all rules when no activity filter is present', () => {
      const payload: CoverageOverviewMitreTechnique = getMockCoverageOverviewMitreTechnique();
      expect(getTotalRuleCount(payload)).toEqual(2);
    });

    it('returns count of one rule type when an activity filter is present', () => {
      const payload: CoverageOverviewMitreTechnique = getMockCoverageOverviewMitreTechnique();
      expect(getTotalRuleCount(payload, [CoverageOverviewRuleActivity.Disabled])).toEqual(1);
    });

    it('returns count of multiple rule type when multiple activity filter is present', () => {
      const payload = getMockCoverageOverviewMitreTechnique();
      expect(
        getTotalRuleCount(payload, [
          CoverageOverviewRuleActivity.Enabled,
          CoverageOverviewRuleActivity.Disabled,
        ])
      ).toEqual(2);
    });
  });

  describe('getNumOfCoveredTechniques', () => {
    it('returns 0 when no techniques are present', () => {
      const payload: CoverageOverviewMitreTactic = getMockCoverageOverviewMitreTactic();
      expect(getNumOfCoveredTechniques(payload)).toEqual(0);
    });

    it('returns number of techniques when present', () => {
      const payload: CoverageOverviewMitreTactic = {
        ...getMockCoverageOverviewMitreTactic(),
        techniques: [
          getMockCoverageOverviewMitreTechnique(),
          getMockCoverageOverviewMitreTechnique(),
        ],
      };
      expect(getNumOfCoveredTechniques(payload)).toEqual(2);
    });
  });
});
