/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiHealth, EuiText } from '@elastic/eui';
import { euiLightVars } from '@kbn/ui-theme';
import { FormattedMessage } from '@kbn/i18n-react';
import { CRITICALITY_LEVEL_TITLE, CRITICALITY_LEVEL_DESCRIPTION } from './translations';
import type { CriticalityLevel } from '../../../../common/entity_analytics/asset_criticality/types';

export const CRITICALITY_LEVEL_COLOR: Record<CriticalityLevel, string> = {
  very_important: '#E7664C',
  important: '#D6BF57',
  normal: '#54B399',
  not_important: euiLightVars.euiColorMediumShade,
};

export const AssetCriticalityBadge: React.FC<{
  criticalityLevel: CriticalityLevel;
  withDescription?: boolean;
  style?: React.CSSProperties;
  className?: string;
  dataTestSubj?: string;
}> = ({
  criticalityLevel,
  style,
  dataTestSubj = 'asset-criticality-badge',
  withDescription = false,
  className,
}) => {
  const showDescription = withDescription ?? false;
  const badgeContent = showDescription ? (
    <>
      <strong>{CRITICALITY_LEVEL_TITLE[criticalityLevel]}</strong>
      <EuiText size="s" color="subdued">
        <p>{CRITICALITY_LEVEL_DESCRIPTION[criticalityLevel]}</p>
      </EuiText>
    </>
  ) : (
    CRITICALITY_LEVEL_TITLE[criticalityLevel]
  );

  return (
    <EuiHealth
      data-test-subj={dataTestSubj}
      color={CRITICALITY_LEVEL_COLOR[criticalityLevel]}
      style={style}
      className={className}
    >
      {badgeContent}
    </EuiHealth>
  );
};

export const AssetCriticalityBadgeAllowMissing: React.FC<{
  criticalityLevel?: CriticalityLevel;
  withDescription?: boolean;
  style?: React.CSSProperties;
  dataTestSubj?: string;
  className?: string;
}> = ({ criticalityLevel, style, dataTestSubj, withDescription, className }) => {
  if (criticalityLevel) {
    return (
      <AssetCriticalityBadge
        criticalityLevel={criticalityLevel}
        dataTestSubj={dataTestSubj}
        withDescription={withDescription}
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
