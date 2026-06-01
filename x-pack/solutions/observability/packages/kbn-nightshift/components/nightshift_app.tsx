/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiAvatarProps } from '@elastic/eui';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiSpacer,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useState } from 'react';
import { useFetchLatestSignificantEvent } from '../hooks/use_fetch_latest_significant_event';
import type { EventDocument } from '../hooks/use_fetch_system_overview';
import { useFlyoutFocusManagement } from '../hooks/use_flyout_focus_management';
import { ImpactedCard } from './impacted_card';
import { LowerPriorityEvents } from './lower_priority_events';
import {
  DEFAULT_MAIN_EVENT_DESCRIPTION,
  DEFAULT_MAIN_EVENT_SCORE,
  DEFAULT_MAIN_EVENT_TITLE,
  MainSignificantEvent,
} from './main_significant_event';
import { MetadataIconCard } from './metadata_icon_card';
import { OtherPromotedEvents } from './other_promoted_events';
import type { SignificantEventDetailFields } from './significant_event_detail_body';
import { SignificantEventDetailBody } from './significant_event_detail_body';
import { SignificantEventDetailHeader } from './significant_event_detail_header';
import { StatusHeader } from './status_header';

interface HealthyMetricCardItem {
  id: string;
  label: string;
  value: React.ReactNode;
  iconType?: NonNullable<EuiAvatarProps['iconType']>;
  iconBackground?: EuiAvatarProps['color'];
  iconColor?: EuiAvatarProps['iconColor'];
  href?: string;
}

export function NightshiftApp() {
  const { euiTheme } = useEuiTheme();
  const [isMainEventFlyoutOpen, setIsMainEventFlyoutOpen] = useState(false);
  const flyoutHeadingId = useGeneratedHtmlId({ prefix: 'mainSignificantEventFlyout' });

  // TODO: Add chat components
  const handleRemediate = useCallback(() => {}, []);
  const handleRemediateEvent = useCallback(() => {}, []);

  // TODO
  const handleSelectedEventChange = useCallback(() => {}, []);
  const lowerPriorityEvents: EventDocument[] = [];
  const selectedEventId = null;
  const lastUpdatedLabel = null;

  const closeMainEventFlyout = useCallback(() => {
    setIsMainEventFlyoutOpen(false);
  }, []);

  const { open: openMainEventFlyout } = useFlyoutFocusManagement({
    isOpen: isMainEventFlyoutOpen,
    onClose: closeMainEventFlyout,
    flyoutTestSubj: 'mainSignificantEventDetailFlyout',
  });

  const { data: mainEvent, otherPromotedEvents } = useFetchLatestSignificantEvent();

  const {
    blastRadiusScore,
    description,
    detailFields,
    impactedCards,
    impactedServices,
    mainEventTitle,
    state,
  } = mainEvent || {};

  const resolvedDetailFields: SignificantEventDetailFields = detailFields ?? {
    id: 'main-event',
    label: mainEventTitle ?? DEFAULT_MAIN_EVENT_TITLE,
    subtitle: '',
    summary: description ?? DEFAULT_MAIN_EVENT_DESCRIPTION,
    rootCause: '',
    recommendations: [],
    recommendedAction: 'investigate',
    criticality: blastRadiusScore ?? DEFAULT_MAIN_EVENT_SCORE,
    ruleNames: [],
    streamNames: [],
    evidences: [],
    dependencyEdges: [],
    causeKis: [],
    timestamp: new Date().toISOString(),
  };

  const handleViewDetails = useCallback(() => {
    openMainEventFlyout();
    setIsMainEventFlyoutOpen(true);
  }, [openMainEventFlyout]);

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

  const healthyMetrics: HealthyMetricCardItem[] = [
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

  const hasLowerPriorityEvents = lowerPriorityEvents && lowerPriorityEvents.length > 0;

  if (state === 'healthy' || state === 'warning') {
    return (
      <div data-test-subj="sigeventsOverview" css={containerCss}>
        <StatusHeader variant="noCriticalEvents" title={mainEventTitle} description={description} />

        <EuiSpacer size="l" />

        <EuiFlexGroup
          gutterSize="s"
          responsive={true}
          wrap
          data-test-subj="sigeventsOverviewHealthyMetrics"
        >
          {healthyMetrics.map(({ id, label, value, iconType, iconBackground, iconColor, href }) => (
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
          ))}
        </EuiFlexGroup>

        {hasLowerPriorityEvents && (
          <>
            <EuiSpacer size="l" />
            <LowerPriorityEvents
              events={lowerPriorityEvents}
              onRemediate={handleRemediateEvent}
              selectedEventId={selectedEventId}
              onSelectedEventChange={handleSelectedEventChange}
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
      <StatusHeader title={mainEventTitle} description={description} />

      <EuiSpacer size="l" />

      {impactedCards && impactedCards.length > 0 && (
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
        description={description}
        impactedServices={impactedServices}
        lastUpdatedLabel={lastUpdatedLabel}
        onRemediate={handleRemediate}
        onViewDetails={handleViewDetails}
      />

      {isMainEventFlyoutOpen ? (
        <EuiFlyout
          type="push"
          side="right"
          size={620}
          onClose={closeMainEventFlyout}
          ownFocus={false}
          pushMinBreakpoint="s"
          paddingSize="m"
          aria-labelledby={flyoutHeadingId}
          data-test-subj="mainSignificantEventDetailFlyout"
        >
          <EuiFlyoutHeader hasBorder>
            <div id={flyoutHeadingId}>
              <SignificantEventDetailHeader
                title={resolvedDetailFields.label || mainEventTitle || ''}
                severityScore={blastRadiusScore}
              />
            </div>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <SignificantEventDetailBody
              event={resolvedDetailFields}
              hideHeader
              onRemediate={handleRemediate}
            />
          </EuiFlyoutBody>
        </EuiFlyout>
      ) : null}

      {otherPromotedEvents && otherPromotedEvents.length > 0 && (
        <>
          <EuiSpacer size="l" />
          <OtherPromotedEvents
            events={otherPromotedEvents}
            onRemediate={handleRemediate}
            selectedEventId={selectedEventId}
            onSelectedEventChange={handleSelectedEventChange}
          />
        </>
      )}
    </div>
  );
}
