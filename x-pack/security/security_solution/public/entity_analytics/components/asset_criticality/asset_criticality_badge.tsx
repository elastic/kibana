/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiHealth } from '@elastic/eui';
import { euiLightVars } from '@kbn/ui-theme';
import { FormattedMessage } from '@kbn/i18n-react';
import { CRITICALITY_LEVEL_TITLE } from './translations';
import type { CriticalityLevel } from '../../../../common/entity_analytics/asset_criticality/types';

export const CRITICALITY_LEVEL_COLOR: Record<CriticalityLevel, string> = {
  extreme_impact: '#E7664C',
  high_impact: '#D6BF57',
  medium_impact: '#54B399',
  low_impact: euiLightVars.euiColorMediumShade,
};

export const AssetCriticalityBadge: React.FC<{
  criticalityLevel: CriticalityLevel;
  style?: React.CSSProperties;
  className?: string;
  dataTestSubj?: string;
}> = ({ criticalityLevel, style, dataTestSubj = 'asset-criticality-badge', className }) => {
  return (
    <EuiHealth
      data-test-subj={dataTestSubj}
      color={CRITICALITY_LEVEL_COLOR[criticalityLevel]}
      style={style}
      className={className}
    >
      {CRITICALITY_LEVEL_TITLE[criticalityLevel]}
    </EuiHealth>
  );
};

export const AssetCriticalityBadgeAllowMissing: React.FC<{
  criticalityLevel?: CriticalityLevel;
  style?: React.CSSProperties;
  dataTestSubj?: string;
  className?: string;
}> = ({ criticalityLevel, style, dataTestSubj, className }) => {
  if (criticalityLevel) {
    return (
      <AssetCriticalityBadge
        criticalityLevel={criticalityLevel}
        dataTestSubj={dataTestSubj}
        style={style}
        className={className}
      />
    );
  }

  return (
    <EuiHealth color="subdued" data-test-subj={dataTestSubj} className={className}>
      <FormattedMessage
        id="xpack.securitySolution.entityAnalytics.assetCriticality.noCriticality"
        defaultMessage="Criticality Unassigned"
      />
    </EuiHealth>
  );
};
