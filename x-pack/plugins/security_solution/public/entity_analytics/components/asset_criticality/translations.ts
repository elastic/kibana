/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { CriticalityLevel } from '../../../../common/entity_analytics/asset_criticality/types';

export const PICK_ASSET_CRITICALITY = i18n.translate(
  'xpack.securitySolution.entityAnalytics.assetCriticality.pickerText',
  {
    defaultMessage: 'Change asset criticality',
  }
);

export const CRITICALITY_LEVEL_TITLE: Record<CriticalityLevel, string> = {
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
export const CRITICALITY_LEVEL_DESCRIPTION: Record<CriticalityLevel, string> = {
  medium_impact: i18n.translate(
    'xpack.securitySolution.entityAnalytics.assetCriticality.levelDescription.normal',
    {
      defaultMessage: 'Entity risk score rises at normal speed',
    }
  ),
  low_impact: i18n.translate(
    'xpack.securitySolution.entityAnalytics.assetCriticality.levelDescription.notImportant',
    {
      defaultMessage: 'Entity risk score rises slower',
    }
  ),
  high_impact: i18n.translate(
    'xpack.securitySolution.entityAnalytics.assetCriticality.levelDescription.important',
    {
      defaultMessage: 'Entity risk score rises faster',
    }
  ),
  extreme_impact: i18n.translate(
    'xpack.securitySolution.entityAnalytics.assetCriticality.levelDescription.veryImportant',
    {
      defaultMessage: 'Entity risk score rises much faster',
    }
  ),
};
