/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CoverageOverviewRuleActivity,
  CoverageOverviewRuleSource,
} from '../../../../../common/api/detection_engine';
import * as i18n from './translations';

export const coverageOverviewPanelWidth = 160;

export const coverageOverviewLegendWidth = 380;

export const coverageOverviewFilterWidth = 300;

/**
 * Rules count -> color map
 *
 * A corresponding color is applied if rules count >= a specific threshold
 */
export const coverageOverviewCardColorThresholds = [
  { threshold: 10, color: '#00BFB3' },
  { threshold: 7, color: '#00BFB399' },
  { threshold: 3, color: '#00BFB34D' },
  { threshold: 1, color: '#00BFB326' },
];

export const ruleActivityFilterDefaultOptions = [
  {
    label: CoverageOverviewRuleActivity.Enabled,
  },
  {
    label: CoverageOverviewRuleActivity.Disabled,
  },
];

export const ruleActivityFilterLabelMap: Record<string, string> = {
  [CoverageOverviewRuleActivity.Enabled]: i18n.CoverageOverviewEnabledRuleActivity,
  [CoverageOverviewRuleActivity.Disabled]: i18n.CoverageOverviewDisabledRuleActivity,
};

export const ruleSourceFilterDefaultOptions = [
  {
    label: CoverageOverviewRuleSource.Prebuilt,
  },
  {
    label: CoverageOverviewRuleSource.Custom,
  },
];

export const ruleSourceFilterLabelMap: Record<string, string> = {
  [CoverageOverviewRuleSource.Prebuilt]: i18n.CoverageOverviewElasticRuleSource,
  [CoverageOverviewRuleSource.Custom]: i18n.CoverageOverviewCustomRuleSource,
};
