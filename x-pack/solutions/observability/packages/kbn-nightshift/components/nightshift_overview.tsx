/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, useEuiTheme } from '@elastic/eui';
import type { EuiAvatarProps } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { StatusHeader } from './status_header';
import { MainSignificantEvent } from './main_significant_event';
import type { ImpactedService } from './main_significant_event';
import { ImpactedCard } from './impacted_card';
import type { ImpactedCardProps } from './impacted_card';
import { MetadataIconCard } from './metadata_icon_card';
import { LowerPriorityEvents } from './lower_priority_events';
import { OtherPromotedEvents } from './other_promoted_events';
import type { EventDocument } from '../hooks/use_fetch_system_overview';
import type { LatestSignificantEventData } from '../hooks/use_fetch_latest_significant_event';

// Re-export EventDocument for convenience
export type { EventDocument };

export type SigEventSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface ImpactedCardItem extends ImpactedCardProps {
  id: string;
}

export interface HealthyMetricCardItem {
  id: string;
  label: string;
  value: React.ReactNode;
  iconType?: NonNullable<EuiAvatarProps['iconType']>;
  iconBackground?: EuiAvatarProps['color'];
  iconColor?: EuiAvatarProps['iconColor'];
  href?: string;
}

const DEFAULT_IMPACTED_CARDS: ImpactedCardItem[] = [
  { id: 'payment', label: 'Service', value: 'payment', iconType: 'layers' },
  { id: 'checkout', label: 'Service', value: 'checkout', iconType: 'layers' },
];

export interface NightshiftOverviewProps {
  state?: 'critical' | 'warning' | 'healthy';
  blastRadiusScore?: number;
  title?: string;
  description?: string;
  mainEventTitle?: string;
  mainEventDescription?: string;
  impactedServices?: ImpactedService[];
  impactedCards?: ImpactedCardItem[];
  healthyMetrics?: HealthyMetricCardItem[];
  otherPromotedEvents?: LatestSignificantEventData[];
  lowerPriorityEvents?: EventDocument[];
  lastUpdatedLabel?: React.ReactNode;
  onRemediate?: () => void;
  onRemediateEvent?: (eventTitle: string, eventId: string) => void;
  onViewDetails?: () => void;
  selectedEventId?: string | null;
  onSelectedEventChange?: (eventId: string | null) => void;
}

export function NightshiftOverview({
  state = 'critical',
  blastRadiusScore,
  title,
  description,
  mainEventTitle,
  mainEventDescription,
  impactedServices,
  impactedCards = DEFAULT_IMPACTED_CARDS,
  healthyMetrics,
  otherPromotedEvents,
  lowerPriorityEvents,
  lastUpdatedLabel,
  onRemediate,
  onRemediateEvent,
  onViewDetails,
  selectedEventId,
  onSelectedEventChange,
}: NightshiftOverviewProps) {
  const { euiTheme } = useEuiTheme();

  const containerCss = css`
    width: 100%;
    align-self: center;
    box-sizing: border-box;
    padding: ${euiTheme.size.l};
  `;

  const bigValueCss = css`
    font-size: ${euiTheme.size.base};
    font-weight: ${euiTheme.font.weight.semiBold};
    color: ${euiTheme.colors.textHeading};
  `;

  const subduedValueCss = css`
    font-size: ${euiTheme.size.base};
    font-weight: ${euiTheme.font.weight.semiBold};
    color: ${euiTheme.colors.textSubdued};
  `;

  const defaultHealthyMetrics: HealthyMetricCardItem[] = [
    {
      id: 'services',
      label: i18n.translate('xpack.nightshift.sigeventsOverview.healthy.services', {
        defaultMessage: 'Services',
      }),
      value: <span css={bigValueCss}>0</span>,
      iconType: 'layers',
      iconBackground: euiTheme.colors.backgroundBaseSubdued,
      iconColor: euiTheme.colors.textParagraph,
    },
    {
      id: 'entities',
      label: i18n.translate('xpack.nightshift.sigeventsOverview.healthy.entities', {
        defaultMessage: 'Entities',
      }),
      value: <span css={bigValueCss}>0</span>,
      iconType: 'submodule',
      iconBackground: euiTheme.colors.backgroundBaseSubdued,
      iconColor: euiTheme.colors.textParagraph,
    },
    {
      id: 'technologies',
      label: i18n.translate('xpack.nightshift.sigeventsOverview.healthy.technologies', {
        defaultMessage: 'Technologies',
      }),
      value: <span css={bigValueCss}>0</span>,
      iconType: 'desktop',
      iconBackground: euiTheme.colors.backgroundBaseSubdued,
      iconColor: euiTheme.colors.textParagraph,
    },
    {
      id: 'criticalSigEvents',
      label: i18n.translate('xpack.nightshift.sigeventsOverview.healthy.critical', {
        defaultMessage: 'Critical',
      }),
      value: <span css={subduedValueCss}>0</span>,
      iconType: 'alert',
      iconBackground: euiTheme.colors.backgroundBaseSubdued,
      iconColor: euiTheme.colors.textSubdued,
    },
    {
      id: 'highSigEvents',
      label: i18n.translate('xpack.nightshift.sigeventsOverview.healthy.high', {
        defaultMessage: 'High',
      }),
      value: <span css={subduedValueCss}>0</span>,
      iconType: 'sortUp',
      iconBackground: euiTheme.colors.backgroundBaseSubdued,
      iconColor: euiTheme.colors.textSubdued,
    },
    {
      id: 'mediumSigEvents',
      label: i18n.translate('xpack.nightshift.sigeventsOverview.healthy.medium', {
        defaultMessage: 'Medium',
      }),
      value: <span css={subduedValueCss}>0</span>,
      iconType: 'dot',
      iconBackground: euiTheme.colors.backgroundBaseSubdued,
      iconColor: euiTheme.colors.textSubdued,
    },
    {
      id: 'lowSigEvents',
      label: i18n.translate('xpack.nightshift.sigeventsOverview.healthy.low', {
        defaultMessage: 'Low',
      }),
      value: <span css={subduedValueCss}>0</span>,
      iconType: 'minusInCircle',
      iconBackground: euiTheme.colors.backgroundBaseSubdued,
      iconColor: euiTheme.colors.textSubdued,
    },
  ];

  const resolvedHealthyMetrics = healthyMetrics ?? defaultHealthyMetrics;
  const hasLowerPriorityEvents = lowerPriorityEvents && lowerPriorityEvents.length > 0;

  if (state === 'healthy' || state === 'warning') {
    return (
      <div data-test-subj="sigeventsOverview" css={containerCss}>
        <StatusHeader variant="noCriticalEvents" title={title} description={description} />

        <EuiSpacer size="l" />

        <EuiFlexGroup
          gutterSize="s"
          responsive={true}
          wrap
          data-test-subj="sigeventsOverviewHealthyMetrics"
        >
          {resolvedHealthyMetrics.map(
            ({ id, label, value, iconType, iconBackground, iconColor, href }) => (
              <EuiFlexItem key={id} grow={1}>
                <MetadataIconCard
                  title={label}
                  value={value}
                  iconType={iconType}
                  color={iconBackground}
                  iconColor={iconColor}
                  href={href}
                />
              </EuiFlexItem>
            )
          )}
        </EuiFlexGroup>

        {hasLowerPriorityEvents && (
          <>
            <EuiSpacer size="l" />
            <LowerPriorityEvents
              events={lowerPriorityEvents}
              onRemediate={onRemediateEvent}
              selectedEventId={selectedEventId}
              onSelectedEventChange={onSelectedEventChange}
            />
          </>
        )}
      </div>
    );
  }

  if (state !== 'critical') {
    return null;
  }

  return (
    <div data-test-subj="sigeventsOverview" css={containerCss}>
      <StatusHeader title={title} description={description} />

      <EuiSpacer size="l" />

      {impactedCards.length > 0 && (
        <>
          <EuiFlexGroup
            gutterSize="s"
            responsive={false}
            wrap
            data-test-subj="sigeventsOverviewImpactedCards"
          >
            {impactedCards.map(({ id, ...card }) => (
              <EuiFlexItem key={id}>
                <ImpactedCard {...card} />
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>

          <EuiSpacer size="s" />
        </>
      )}

      <MainSignificantEvent
        blastRadiusScore={blastRadiusScore}
        title={mainEventTitle}
        description={mainEventDescription}
        impactedServices={impactedServices}
        lastUpdatedLabel={lastUpdatedLabel}
        onRemediate={onRemediate}
        onViewDetails={onViewDetails}
      />

      {otherPromotedEvents && otherPromotedEvents.length > 0 && (
        <>
          <EuiSpacer size="l" />
          <OtherPromotedEvents
            events={otherPromotedEvents}
            onRemediate={onRemediateEvent}
            selectedEventId={selectedEventId}
            onSelectedEventChange={onSelectedEventChange}
          />
        </>
      )}
    </div>
  );
}
