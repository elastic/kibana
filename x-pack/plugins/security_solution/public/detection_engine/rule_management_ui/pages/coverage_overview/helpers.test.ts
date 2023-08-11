/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getCoverageOverviewFilterMock } from '../../../../../common/api/detection_engine/rule_management/coverage_overview/coverage_overview_route.mock';
import {
  getMockCoverageOverviewMitreSubTechnique,
  getMockCoverageOverviewMitreTactic,
  getMockCoverageOverviewMitreTechnique,
} from '../../../rule_management/model/coverage_overview/__mocks__';
import { ruleStatusFilterDefaultOptions, ruleTypeFilterDefaultOptions } from './constants';
import {
  formatRuleFilterOptions,
  getInitialRuleStatusFilterOptions,
  getInitialRuleTypeFilterOptions,
  getNumOfCoveredSubtechniques,
  getNumOfCoveredTechniques,
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

  describe('formatRuleFilterOptions', () => {
    it('returns empty array when no options are checked', () => {
      const payload = ruleStatusFilterDefaultOptions;
      expect(formatRuleFilterOptions(payload)).toEqual([]);
    });

    it('returns checked options when present', () => {
      const payload = [
        ...ruleStatusFilterDefaultOptions,
        { ...ruleStatusFilterDefaultOptions[0], checked: 'on' },
      ];
      expect(formatRuleFilterOptions(payload)).toEqual([ruleStatusFilterDefaultOptions[0].key]);
    });
  });

  describe('getInitialRuleStatusFilterOptions', () => {
    it('returns default status options when no filter is present', () => {
      const payload = {};
      expect(getInitialRuleStatusFilterOptions(payload)).toEqual(ruleStatusFilterDefaultOptions);
    });

    it('returns correct options checked when present in filter', () => {
      const payload = getCoverageOverviewFilterMock();
      expect(getInitialRuleStatusFilterOptions(payload)).toMatchInlineSnapshot(`
        Array [
          Object {
            "checked": "on",
            "key": "enabled",
            "label": "Enabled rules",
          },
          Object {
            "key": "disabled",
            "label": "Disabled rules",
          },
        ]
      `);
    });
  });

  describe('getInitialRuleTypeFilterOptions', () => {
    it('returns default type options when no filter is present', () => {
      const payload = {};
      expect(getInitialRuleTypeFilterOptions(payload)).toEqual(ruleTypeFilterDefaultOptions);
    });

    it('returns correct options checked when present in filter', () => {
      const payload = getCoverageOverviewFilterMock();
      expect(getInitialRuleTypeFilterOptions(payload)).toMatchInlineSnapshot(`
        Array [
          Object {
            "checked": "on",
            "key": "prebuilt",
            "label": "Elastic rules",
          },
          Object {
            "key": "customized",
            "label": "Elastic customized rules",
          },
          Object {
            "key": "custom",
            "label": "Custom rules",
          },
        ]
      `);
    });
  });
});
