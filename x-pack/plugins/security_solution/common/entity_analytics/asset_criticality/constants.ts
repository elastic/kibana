/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { euiLightVars } from '@kbn/ui-theme';
import type { AssetCriticalityRecord } from '../api/entity_analytics/asset_criticality';

export const ASSET_CRITICALITY_INDEX_PATTERN = '.asset-criticality.asset-criticality-*';

type AssetCriticalityIndexPrivilege = 'read' | 'write';
export const ASSET_CRITICALITY_REQUIRED_ES_INDEX_PRIVILEGES = {
  [ASSET_CRITICALITY_INDEX_PATTERN]: ['read', 'write'] as AssetCriticalityIndexPrivilege[],
};

export const PICK_ASSET_CRITICALITY = i18n.translate(
  'xpack.securitySolution.timeline.sidePanel.hostDetails.assetCriticality.pick',
  {
    defaultMessage: 'Pick asset criticality level',
  }
);

export const CREATE_ASSET_CRITICALITY = i18n.translate(
  'xpack.securitySolution.timeline.sidePanel.hostDetails.assetCriticality.create',
  {
    defaultMessage: 'No criticality assigned yet',
  }
);

export const ASSET_CRITICALITY_OPTION_TEXT: Record<
  AssetCriticalityRecord['criticality_level'],
  string
> = {
  normal: i18n.translate(
    'xpack.securitySolution.timeline.sidePanel.hostDetails.assetCriticality.pickerOption.normal',
    {
      defaultMessage: 'Entity risk score rises at normal speed',
    }
  ),
  not_important: i18n.translate(
    'xpack.securitySolution.timeline.sidePanel.hostDetails.assetCriticality.pickerOption.notImportant',
    {
      defaultMessage: 'Entity risk score rises slower',
    }
  ),
  important: i18n.translate(
    'xpack.securitySolution.timeline.sidePanel.hostDetails.assetCriticality.pickerOption.important',
    {
      defaultMessage: 'Entity risk score rises faster',
    }
  ),
  very_important: i18n.translate(
    'xpack.securitySolution.timeline.sidePanel.hostDetails.assetCriticality.pickerOption.veryImportant',
    {
      defaultMessage: 'Entity risk score rises much faster',
    }
  ),
};

export const CRITICALITY_LEVEL_COLOR: Record<AssetCriticalityRecord['criticality_level'], string> =
  {
    very_important: '#E7664C',
    important: '#D6BF57',
    normal: '#54B399',
    not_important: euiLightVars.euiColorMediumShade,
  };
