/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoverageOverviewRuleActivity } from '../../../../../common/api/detection_engine';
import { getCoverageOverviewFilterMock } from '../../../../../common/api/detection_engine/rule_management/coverage_overview/coverage_overview_route.mock';
import {
  getMockCoverageOverviewMitreSubTechnique,
  getMockCoverageOverviewMitreTactic,
  getMockCoverageOverviewMitreTechnique,
} from '../../../rule_management/model/coverage_overview/__mocks__';
import { ruleActivityFilterDefaultOptions } from './constants';
import {
  extractSelected,
  getNumOfCoveredSubtechniques,
  getNumOfCoveredTechniques,
  populateSelected,
} from './helpers';

describe('helpers', () => {
  describe('getNumOfCoveredTechniques', () => {
    it('returns 0 when no techniques are present', () => {
      const payload = getMockCoverageOverviewMitreTactic();
      expect(getNumOfCoveredTechniques(payload)).toEqual(0);
    });

    it('returns number of techniques when present', () => {
      const payload = {
        ...getMockCoverageOverviewMitreTactic(),
        techniques: [
          getMockCoverageOverviewMitreTechnique(),
          getMockCoverageOverviewMitreTechnique(),
        ],
      };
      expect(getNumOfCoveredTechniques(payload)).toEqual(2);
    });
  });

  describe('getNumOfCoveredSubtechniques', () => {
    it('returns 0 when no subtechniques are present', () => {
      const payload = getMockCoverageOverviewMitreTechnique();
      expect(getNumOfCoveredSubtechniques(payload)).toEqual(0);
    });

    it('returns number of subtechniques when present', () => {
      const payload = {
        ...getMockCoverageOverviewMitreTechnique(),
        subtechniques: [
          getMockCoverageOverviewMitreSubTechnique(),
          getMockCoverageOverviewMitreSubTechnique(),
        ],
      };
      expect(getNumOfCoveredSubtechniques(payload)).toEqual(2);
    });
  });

  describe('extractSelected', () => {
    it('returns empty array when no options are checked', () => {
      const payload = ruleActivityFilterDefaultOptions;
      expect(extractSelected(payload)).toEqual([]);
    });

    it('returns checked options when present', () => {
      const payload = [
        ...ruleActivityFilterDefaultOptions,
        { ...ruleActivityFilterDefaultOptions[0], checked: 'on' },
      ];
      expect(extractSelected(payload)).toEqual([ruleActivityFilterDefaultOptions[0].label]);
    });
  });

  describe('populateSelected', () => {
    it('returns default status options when no filter is present', () => {
      const payload: CoverageOverviewRuleActivity[] = [];
      expect(populateSelected(ruleActivityFilterDefaultOptions, payload)).toEqual(
        ruleActivityFilterDefaultOptions
      );
    });

    it('returns correct options checked when present in filter', () => {
      const payload = getCoverageOverviewFilterMock().activity;
      expect(populateSelected(ruleActivityFilterDefaultOptions, payload)).toEqual([
        { label: 'enabled', checked: 'on' },
        { label: 'disabled' },
      ]);
    });
  });
});
