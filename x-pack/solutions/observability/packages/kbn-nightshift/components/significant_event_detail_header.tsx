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
  EuiIcon,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import type { EuiIconProps } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { getSeverityFromScore } from './event_utils';

export interface SignificantEventDetailHeaderProps {
  title: string;
  detectedAtLabel?: string;
  severityScore?: number;
  recommendedActionLabel?: string;
  recommendedActionIconType?: EuiIconProps['type'];
  hideMetadataCards?: boolean;
}

const DEFAULT_DETECTED_AT_LABEL = i18n.translate(
  'xpack.nightshift.sigeventsOverview.sigEvents.defaultDetectedAtLabel',
  { defaultMessage: 'Detected 5 minutes ago' }
);

const DEFAULT_RECOMMENDED_ACTION_LABEL = i18n.translate(
  'xpack.nightshift.sigeventsOverview.sigEvents.defaultRecommendedActionLabel',
  { defaultMessage: 'Escalate' }
);

export const SignificantEventDetailHeader = ({
  title,
  detectedAtLabel = DEFAULT_DETECTED_AT_LABEL,
  severityScore = 90,
  recommendedActionLabel = DEFAULT_RECOMMENDED_ACTION_LABEL,
  recommendedActionIconType = 'warning',
  hideMetadataCards = false,
}: SignificantEventDetailHeaderProps) => {
  const { euiTheme } = useEuiTheme();

  const detectedAtCss = css`
    display: inline-flex;
    align-items: center;
    gap: ${euiTheme.size.xs};
    color: ${euiTheme.colors.textSubdued};
  `;

  const severity = useMemo(() => getSeverityFromScore(severityScore), [severityScore]);

  const severityCardTitle = i18n.translate(
    'xpack.nightshift.sigeventsOverview.sigEvents.metaSeverityTitle',
    { defaultMessage: 'Severity' }
  );

  const recommendedActionCardTitle = i18n.translate(
    'xpack.nightshift.sigeventsOverview.sigEvents.metaRecommendedActionTitle',
    { defaultMessage: 'Recommended action' }
  );

  return (
    <div data-test-subj="sigeventsOverviewSignificantEventDetailHeader">
      <EuiTitle size="s">
        <h2>{title}</h2>
      </EuiTitle>

      {!hideMetadataCards ? (
        <EuiFlexGroup
          gutterSize="m"
          responsive={false}
          wrap
          alignItems="center"
          css={css`
            margin-top: ${euiTheme.size.s};
          `}
          data-test-subj="sigeventsOverviewSignificantEventDetailHeaderMetadata"
        >
          <EuiFlexItem grow={false} css={css({ whiteSpace: 'nowrap' })}>
            <EuiText size="xs" css={detectedAtCss}>
              <EuiIcon type="clock" size="s" aria-hidden />
              <span>{detectedAtLabel}</span>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false} css={css({ whiteSpace: 'nowrap' })}>
            <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  {severityCardTitle}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiBadge color={severity.badgeColor}>{severity.label}</EuiBadge>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false} css={css({ whiteSpace: 'nowrap' })}>
            <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  {recommendedActionCardTitle}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiBadge color="warning" iconType={recommendedActionIconType}>
                  {recommendedActionLabel}
                </EuiBadge>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : (
        <EuiText size="xs" css={detectedAtCss}>
          <EuiIcon type="clock" size="s" aria-hidden />
          <span>{detectedAtLabel}</span>
        </EuiText>
      )}
    </div>
  );
};
