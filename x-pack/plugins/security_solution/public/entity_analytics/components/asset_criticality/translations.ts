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
    defaultMessage: 'Pick asset criticality level',
  }
);

export const CRITICALITY_LEVEL_TITLE: Record<CriticalityLevel, string> = {
  normal: i18n.translate(
    'xpack.securitySolution.entityAnalytics.assetCriticality.levelTitle.normal',
    {
      defaultMessage: 'Normal',
    }
  ),
  not_important: i18n.translate(
    'xpack.securitySolution.entityAnalytics.assetCriticality.levelTitle.notImportant',
    {
      defaultMessage: 'Not important',
    }
  ),
  important: i18n.translate(
    'xpack.securitySolution.entityAnalytics.assetCriticality.levelTitle.important',
    {
      defaultMessage: 'Important',
    }
  ),
  very_important: i18n.translate(
    'xpack.securitySolution.entityAnalytics.assetCriticality.levelTitle.veryImportant',
    {
      defaultMessage: 'Very important',
    }
  ),
};
export const CRITICALITY_LEVEL_DESCRIPTION: Record<CriticalityLevel, string> = {
  normal: i18n.translate(
    'xpack.securitySolution.entityAnalytics.assetCriticality.levelDescription.normal',
    {
      defaultMessage: 'Entity risk score rises at normal speed',
    }
  ),
  not_important: i18n.translate(
    'xpack.securitySolution.entityAnalytics.assetCriticality.levelDescription.notImportant',
    {
      defaultMessage: 'Entity risk score rises slower',
    }
  ),
  important: i18n.translate(
    'xpack.securitySolution.entityAnalytics.assetCriticality.levelDescription.important',
    {
      defaultMessage: 'Entity risk score rises faster',
    }
  ),
  very_important: i18n.translate(
    'xpack.securitySolution.entityAnalytics.assetCriticality.levelDescription.veryImportant',
    {
      defaultMessage: 'Entity risk score rises much faster',
    }
  ),
};
