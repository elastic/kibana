/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { CriticalityLevelWithUnassigned } from '../../../../common/entity_analytics/asset_criticality/types';

export const PICK_ASSET_CRITICALITY = i18n.translate(
  'xpack.securitySolution.entityAnalytics.assetCriticality.pickerText',
  {
    defaultMessage: 'Change asset criticality',
  }
);

export const CRITICALITY_LEVEL_TITLE: Record<CriticalityLevelWithUnassigned, string> = {
  unassigned: i18n.translate(
    'xpack.securitySolution.entityAnalytics.assetCriticality.levelTitle.unassigned',
    {
      defaultMessage: 'Unassigned',
    }
  ),
  medium_impact: i18n.translate(
    'xpack.securitySolution.entityAnalytics.assetCriticality.levelTitle.mediumImpact',
    {
      defaultMessage: 'Medium Impact',
    }
  ),
  low_impact: i18n.translate(
    'xpack.securitySolution.entityAnalytics.assetCriticality.levelTitle.lowImpact',
    {
      defaultMessage: 'Low Impact',
    }
  ),
  high_impact: i18n.translate(
    'xpack.securitySolution.entityAnalytics.assetCriticality.levelTitle.highImpact',
    {
      defaultMessage: 'High Impact',
    }
  ),
  extreme_impact: i18n.translate(
    'xpack.securitySolution.entityAnalytics.assetCriticality.levelTitle.extremeImpact',
    {
      defaultMessage: 'Extreme Impact',
    }
  ),
};
