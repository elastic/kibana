/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiBadgeGroup,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import type { EuiBadgeProps } from '@elastic/eui';
import { AiButton } from '@kbn/shared-ux-ai-components';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { CriticalityDonut } from './criticality_donut';
import { getSeverityFromScore } from './event_utils';

const CARD_BORDER_RADIUS = '8px';
const DONUT_SIZE = 75;
const DONUT_STROKE = 12;

export interface ImpactedService {
  id: string;
  label: string;
  iconType?: EuiBadgeProps['iconType'];
}

export interface MainSignificantEventProps {
  blastRadiusScore?: number;
  lastUpdatedLabel?: React.ReactNode;
  title?: string;
  impactedServices?: ImpactedService[];
  description?: string;
  remediateLabel?: string;
  viewDetailsLabel?: string;
  onRemediate?: () => void;
  onViewDetails?: () => void;
}

export const DEFAULT_MAIN_EVENT_SCORE = 90;

export const DEFAULT_MAIN_EVENT_LAST_UPDATED_LABEL = i18n.translate(
  'xpack.nightshift.sigeventsOverview.mainSignificantEvent.lastUpdated',
  { defaultMessage: '(5 minutes ago)' }
);

export const DEFAULT_MAIN_EVENT_TITLE = i18n.translate(
  'xpack.nightshift.sigeventsOverview.mainSignificantEvent.defaultTitle',
  {
    defaultMessage:
      'Dropped payments on oteldemo.com and video streams on otelfix.com due to unavailable Auth Service',
  }
);

export const DEFAULT_MAIN_EVENT_DESCRIPTION = i18n.translate(
  'xpack.nightshift.sigeventsOverview.mainSignificantEvent.defaultDescription',
  {
    defaultMessage:
      'Start remediation now with Elastic Agent Builder or review details to get more context about the impact.',
  }
);

export const DEFAULT_MAIN_EVENT_IMPACTED_SERVICES: ImpactedService[] = [
  { id: 'payment', label: 'payment', iconType: 'layers' },
  { id: 'checkout', label: 'checkout', iconType: 'layers' },
];

export function MainSignificantEvent(props: MainSignificantEventProps) {
  const {
    blastRadiusScore = DEFAULT_MAIN_EVENT_SCORE,
    lastUpdatedLabel = DEFAULT_MAIN_EVENT_LAST_UPDATED_LABEL,
    title = DEFAULT_MAIN_EVENT_TITLE,
    impactedServices = DEFAULT_MAIN_EVENT_IMPACTED_SERVICES,
    description = DEFAULT_MAIN_EVENT_DESCRIPTION,
    remediateLabel,
    viewDetailsLabel,
    onRemediate,
    onViewDetails,
  } = props;

  const { euiTheme } = useEuiTheme();
  const severity = getSeverityFromScore(blastRadiusScore);

  const remediateText =
    remediateLabel ??
    i18n.translate('xpack.nightshift.sigeventsOverview.mainSignificantEvent.remediate', {
      defaultMessage: 'Remediate in Chat',
    });

  const viewDetailsText =
    viewDetailsLabel ??
    i18n.translate('xpack.nightshift.sigeventsOverview.mainSignificantEvent.viewDetails', {
      defaultMessage: 'View Details',
    });

  const cardCss = css`
    border: ${euiTheme.border.thin};
    border-radius: ${CARD_BORDER_RADIUS};
    overflow: hidden;
    width: 100%;
    box-sizing: border-box;
  `;

  const topSectionCss = css`
    background: ${euiTheme.colors.backgroundBaseSubdued};
    padding: ${euiTheme.size.m} ${euiTheme.size.l};
  `;

  const bottomSectionCss = css`
    background: ${euiTheme.colors.backgroundBasePlain};
    padding: ${euiTheme.size.base} ${euiTheme.size.l};
    border-top: ${euiTheme.border.thin};
  `;

  const impactedServicesLabelCss = css`
    color: ${euiTheme.colors.textParagraph};
    font-weight: ${euiTheme.font.weight.medium};
  `;

  return (
    <div css={cardCss} data-test-subj="sigeventsOverviewMainSignificantEvent">
      <div css={topSectionCss}>
        <EuiFlexGroup responsive={false} alignItems="center" gutterSize="l">
          <EuiFlexItem grow={false}>
            <CriticalityDonut
              score={blastRadiusScore}
              size={DONUT_SIZE}
              strokeWidth={DONUT_STROKE}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={true}>
            <EuiFlexGroup
              responsive={false}
              alignItems="center"
              justifyContent="spaceBetween"
              gutterSize="s"
            >
              <EuiFlexItem grow={false}>
                <EuiBadge color={severity.badgeColor} iconType="dot">
                  {severity.label}
                </EuiBadge>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  {lastUpdatedLabel}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>

            <EuiSpacer size="s" />

            <EuiTitle size="xs">
              <h3>{title}</h3>
            </EuiTitle>

            <EuiSpacer size="xs" />

            <EuiFlexGroup
              responsive={false}
              alignItems="center"
              gutterSize="xs"
              wrap
              data-test-subj="sigeventsOverviewMainSignificantEventImpactedServices"
            >
              <EuiFlexItem grow={false}>
                <EuiText size="xs" css={impactedServicesLabelCss}>
                  {i18n.translate(
                    'xpack.nightshift.sigeventsOverview.mainSignificantEvent.impactedServicesLabel',
                    { defaultMessage: 'Impacted services:' }
                  )}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiBadgeGroup gutterSize="xs">
                  {impactedServices.map((service) => (
                    <EuiBadge
                      key={service.id}
                      color="hollow"
                      iconType={service.iconType ?? 'layers'}
                    >
                      {service.label}
                    </EuiBadge>
                  ))}
                </EuiBadgeGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>

      <div css={bottomSectionCss}>
        <EuiText size="s">
          <p>{description}</p>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiFlexGroup responsive={false} wrap gutterSize="s">
          <EuiFlexItem grow={false}>
            <AiButton
              data-test-subj="sigeventsOverviewMainSignificantEventRemediateButton"
              size="s"
              iconType="productAgent"
              onClick={onRemediate}
            >
              {remediateText}
            </AiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="sigeventsOverviewMainSignificantEventViewDetailsButton"
              size="s"
              color="text"
              onClick={onViewDetails}
            >
              {viewDetailsText}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    </div>
  );
}
