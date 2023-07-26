/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getMockCoverageOverviewMitreSubTechnique,
  getMockCoverageOverviewMitreTactic,
  getMockCoverageOverviewMitreTechnique,
} from '../../../rule_management/model/coverage_overview/__mocks__';
import { getCoveredSubtechniques, getCoveredTechniques } from './helpers';

describe('helpers', () => {
  describe('getCoveredTechniques', () => {
    it('returns 0 when no techniques are present', () => {
      const payload = getMockCoverageOverviewMitreTactic();
      expect(getCoveredTechniques(payload)).toEqual(0);
    });

    it('returns number of techniques when present', () => {
      const payload = {
        ...getMockCoverageOverviewMitreTactic(),
        techniques: [
          getMockCoverageOverviewMitreTechnique(),
          getMockCoverageOverviewMitreTechnique(),
        ],
      };
      expect(getCoveredTechniques(payload)).toEqual(2);
    });
  });

  describe('getCoveredSubtechniques', () => {
    it('returns 0 when no subtechniques are present', () => {
      const payload = getMockCoverageOverviewMitreTechnique();
      expect(getCoveredSubtechniques(payload)).toEqual(0);
    });

    it('returns number of subtechniques when present', () => {
      const payload = {
        ...getMockCoverageOverviewMitreTechnique(),
        subtechniques: [
          getMockCoverageOverviewMitreSubTechnique(),
          getMockCoverageOverviewMitreSubTechnique(),
        ],
      };
      expect(getCoveredSubtechniques(payload)).toEqual(2);
    });
  });
});
