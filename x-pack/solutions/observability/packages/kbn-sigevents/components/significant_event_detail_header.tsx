/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiIcon,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import type { EuiBadgeProps, EuiHealthProps, EuiIconProps } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { MetadataIconCard } from './metadata_icon_card';

export interface SignificantEventDetailHeaderProps {
  title: string;
  detectedAtLabel?: string;
  severityLabel: string;
  severityColor: EuiBadgeProps['color'];
  criticalityLabel?: string;
  criticalityColor?: EuiHealthProps['color'];
  impactLabel?: string;
  impactColor?: EuiBadgeProps['color'];
  recommendedActionLabel?: string;
  recommendedActionIconType?: EuiIconProps['type'];
  hideMetadataCards?: boolean;
}

const DEFAULT_DETECTED_AT_LABEL = i18n.translate(
  'xpack.observability.sigeventsOverview.sigEvents.defaultDetectedAtLabel',
  { defaultMessage: 'Detected 5 minutes ago' }
);

const DEFAULT_CRITICALITY_LABEL = i18n.translate(
  'xpack.observability.sigeventsOverview.sigEvents.defaultCriticalityLabel',
  { defaultMessage: 'High' }
);

const DEFAULT_IMPACT_LABEL = i18n.translate(
  'xpack.observability.sigeventsOverview.sigEvents.defaultImpactLabel',
  { defaultMessage: 'High' }
);

const DEFAULT_RECOMMENDED_ACTION_LABEL = i18n.translate(
  'xpack.observability.sigeventsOverview.sigEvents.defaultRecommendedActionLabel',
  { defaultMessage: 'Escalate' }
);

export function SignificantEventDetailHeader({
  title,
  detectedAtLabel = DEFAULT_DETECTED_AT_LABEL,
  severityLabel,
  severityColor,
  criticalityLabel = DEFAULT_CRITICALITY_LABEL,
  criticalityColor,
  impactLabel = DEFAULT_IMPACT_LABEL,
  impactColor = 'danger',
  recommendedActionLabel = DEFAULT_RECOMMENDED_ACTION_LABEL,
  recommendedActionIconType = 'warning',
  hideMetadataCards = false,
}: SignificantEventDetailHeaderProps) {
  const { euiTheme } = useEuiTheme();

  const detectedAtCss = css`
    display: inline-flex;
    align-items: center;
    gap: ${euiTheme.size.xs};
    color: ${euiTheme.colors.textSubdued};
  `;

  const severityCardTitle = i18n.translate(
    'xpack.observability.sigeventsOverview.sigEvents.metaSeverityTitle',
    { defaultMessage: 'Severity' }
  );

  const criticalityCardTitle = i18n.translate(
    'xpack.observability.sigeventsOverview.sigEvents.metaCriticalityTitle',
    { defaultMessage: 'Criticality' }
  );

  const impactCardTitle = i18n.translate(
    'xpack.observability.sigeventsOverview.sigEvents.metaImpactTitle',
    { defaultMessage: 'Impact' }
  );

  const recommendedActionCardTitle = i18n.translate(
    'xpack.observability.sigeventsOverview.sigEvents.metaRecommendedActionTitle',
    { defaultMessage: 'Recommended action' }
  );

  const resolvedCriticalityColor: EuiHealthProps['color'] = useMemo(() => {
    if (criticalityColor) return criticalityColor;
    if (severityColor === 'danger') return 'danger';
    if (severityColor === 'warning') return 'warning';
    if (severityColor === 'success') return 'success';
    return 'subdued';
  }, [criticalityColor, severityColor]);

  return (
    <div data-test-subj="sigeventsOverviewSignificantEventDetailHeader">
      <EuiTitle size="s">
        <h2>{title}</h2>
      </EuiTitle>
      <EuiSpacer size="xs" />
      <EuiText size="xs" css={detectedAtCss}>
        <EuiIcon type="clock" size="s" aria-hidden />
        <span>{detectedAtLabel}</span>
      </EuiText>

      {!hideMetadataCards ? (
        <>
          <EuiSpacer size="m" />
          <EuiFlexGroup
            gutterSize="s"
            responsive={true}
            wrap
            data-test-subj="sigeventsOverviewSignificantEventDetailHeaderMetadata"
          >
            <EuiFlexItem grow={true}>
              <MetadataIconCard
                hideIcon
                title={severityCardTitle}
                value={<EuiBadge color={severityColor}>{severityLabel}</EuiBadge>}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={true}>
              <MetadataIconCard
                hideIcon
                title={criticalityCardTitle}
                value={<EuiHealth color={resolvedCriticalityColor}>{criticalityLabel}</EuiHealth>}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={true}>
              <MetadataIconCard
                hideIcon
                title={impactCardTitle}
                value={<EuiBadge color={impactColor}>{impactLabel}</EuiBadge>}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={true}>
              <MetadataIconCard
                hideIcon
                title={recommendedActionCardTitle}
                value={
                  <EuiBadge color="warning" iconType={recommendedActionIconType}>
                    {recommendedActionLabel}
                  </EuiBadge>
                }
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      ) : null}
    </div>
  );
}
