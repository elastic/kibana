/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiPalettePositive } from '@elastic/eui';
import {
  CoverageOverviewRuleActivity,
  CoverageOverviewRuleSource,
} from '../../../../../common/api/detection_engine';
import * as i18n from './translations';

export const coverageOverviewPaletteColors = euiPalettePositive(5);

export const coverageOverviewPanelWidth = 160;

export const coverageOverviewLegendWidth = 380;

export const coverageOverviewFilterWidth = 300;

/**
 * Rules count -> color map
 *
 * A corresponding color is applied if rules count >= a specific threshold
 */
export const coverageOverviewCardColorThresholds = [
  { threshold: 10, color: coverageOverviewPaletteColors[3] },
  { threshold: 7, color: coverageOverviewPaletteColors[2] },
  { threshold: 3, color: coverageOverviewPaletteColors[1] },
  { threshold: 1, color: coverageOverviewPaletteColors[0] },
];

export const ruleStatusFilterOptions = [
  {
    label: i18n.CoverageOverviewEnabledRuleStatus,
    key: CoverageOverviewRuleActivity.Enabled,
  },
  {
    label: i18n.CoverageOverviewDisabledRuleStatus,
    key: CoverageOverviewRuleActivity.Disabled,
  },
];

export const ruleTypeFilterOptions = [
  {
    label: i18n.CoverageOverviewElasticRuleType,
    key: CoverageOverviewRuleSource.Prebuilt,
  },
  {
    label: i18n.CoverageOverviewCustomizedRuleType,
    key: CoverageOverviewRuleSource.Customized,
  },
  {
    label: i18n.CoverageOverviewCustomRuleType,
    key: CoverageOverviewRuleSource.Custom,
  },
];
