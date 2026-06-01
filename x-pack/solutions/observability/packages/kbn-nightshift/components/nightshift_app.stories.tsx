/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { action } from '@storybook/addon-actions';
import type { EventDocument } from '../hooks/use_fetch_system_overview';
import { NightshiftApp } from './nightshift_app';
import type { HealthyMetricCardItem } from './nightshift_app';
import {
  makeAcknowledgedEvents,
  makePromotedEventsData,
} from '../__fixtures__/sigevents_test_data';

const meta: Meta<typeof NightshiftApp> = {
  title: 'app/Nightshift/NightshiftApp',
  component: NightshiftApp,
  argTypes: {
    state: {
      control: 'select',
      options: ['critical', 'warning', 'healthy'],
    },
    blastRadiusScore: {
      control: { type: 'range', min: 0, max: 100 },
    },
  },
};

export default meta;
type Story = StoryObj<typeof NightshiftApp>;

// ---------------------------------------------------------------------------
// Shared test data (from the common test fixtures module)
// ---------------------------------------------------------------------------

const now = new Date().toISOString();

const acknowledgedEvents: EventDocument[] = makeAcknowledgedEvents(now) as EventDocument[];
const promotedEventsData = makePromotedEventsData(now);
const [mainPromotedEvent, ...otherPromotedEventsData] = promotedEventsData;

// ---------------------------------------------------------------------------
// Act 0 — No Detection Workflows
// Healthy state: no events, no detections, zero metrics.
// ---------------------------------------------------------------------------

export const Act0NoDetectionWorkflows: Story = {
  name: 'Act 0: No Detection Workflows',
  args: {
    state: 'healthy',
    lowerPriorityEvents: [],
    impactedCards: [],
    onRemediate: action('onRemediate'),
    onViewDetails: action('onViewDetails'),
  },
};

// ---------------------------------------------------------------------------
// Act 1 — We Know Your System
// Healthy state with lower priority (acknowledged) events, detections, and
// service metrics — but no promoted/critical events.
// ---------------------------------------------------------------------------

function Act1Render() {
  const { euiTheme } = useEuiTheme();

  const bigValueCss = css`
    font-size: ${euiTheme.size.base};
    font-weight: ${euiTheme.font.weight.semiBold};
    color: ${euiTheme.colors.textHeading};
  `;

  const primaryValueCss = css`
    font-size: ${euiTheme.size.base};
    font-weight: ${euiTheme.font.weight.semiBold};
    color: ${euiTheme.colors.primary};
  `;

  const subduedValueCss = css`
    font-size: ${euiTheme.size.base};
    font-weight: ${euiTheme.font.weight.semiBold};
    color: ${euiTheme.colors.textSubdued};
  `;

  const healthyMetrics: HealthyMetricCardItem[] = [
    {
      id: 'services',
      label: 'Services',
      value: <span css={bigValueCss}>3</span>,
      iconType: 'layers',
      iconBackground: euiTheme.colors.backgroundBaseSubdued,
      iconColor: euiTheme.colors.textParagraph,
    },
    {
      id: 'entities',
      label: 'Entities',
      value: <span css={bigValueCss}>5</span>,
      iconType: 'submodule',
      iconBackground: euiTheme.colors.backgroundBaseSubdued,
      iconColor: euiTheme.colors.textParagraph,
    },
    {
      id: 'technologies',
      label: 'Technologies',
      value: <span css={bigValueCss}>2</span>,
      iconType: 'desktop',
      iconBackground: euiTheme.colors.backgroundBaseSubdued,
      iconColor: euiTheme.colors.textParagraph,
    },
    {
      id: 'criticalSigEvents',
      label: 'Critical',
      value: <span css={subduedValueCss}>0</span>,
      iconType: 'alert',
      iconBackground: euiTheme.colors.backgroundBaseSubdued,
      iconColor: euiTheme.colors.textSubdued,
    },
    {
      id: 'highSigEvents',
      label: 'High',
      value: <span css={subduedValueCss}>0</span>,
      iconType: 'sortUp',
      iconBackground: euiTheme.colors.backgroundBaseSubdued,
      iconColor: euiTheme.colors.textSubdued,
    },
    {
      id: 'mediumSigEvents',
      label: 'Medium',
      value: <span css={primaryValueCss}>1</span>,
      iconType: 'dot',
      iconBackground: euiTheme.colors.backgroundLightPrimary,
      iconColor: euiTheme.colors.primary,
    },
    {
      id: 'lowSigEvents',
      label: 'Low',
      value: <span css={subduedValueCss}>1</span>,
      iconType: 'minusInCircle',
      iconBackground: euiTheme.colors.backgroundBaseSubdued,
      iconColor: euiTheme.colors.textSubdued,
    },
  ];

  return (
    <NightshiftApp
      state="healthy"
      healthyMetrics={healthyMetrics}
      lowerPriorityEvents={acknowledgedEvents}
      impactedCards={[]}
      onRemediate={action('onRemediate')}
      onRemediateEvent={action('onRemediateEvent')}
      onViewDetails={action('onViewDetails')}
    />
  );
}

export const Act1WeKnowYourSystem: Story = {
  name: 'Act 1: We Know Your System',
  render: () => <Act1Render />,
};

// ---------------------------------------------------------------------------
// Act 2 — Something Is Wrong (Critical)
// Critical state with a main promoted event, other promoted events, impacted
// service cards, and lower priority events.
// ---------------------------------------------------------------------------

export const Act2SomethingIsWrong: Story = {
  name: 'Act 2: Something Is Wrong',
  args: {
    state: 'critical',
    blastRadiusScore: mainPromotedEvent?.blastRadiusScore ?? 90,
    mainEventTitle: mainPromotedEvent?.mainEventTitle ?? 'payment — charge processing failures',
    mainEventDescription: mainPromotedEvent?.description,
    impactedServices: mainPromotedEvent?.impactedServices ?? [
      { id: 'payment', label: 'payment', iconType: 'layers' },
      { id: 'checkout', label: 'checkout', iconType: 'layers' },
    ],
    impactedCards: mainPromotedEvent?.impactedCards ?? [
      { id: 'cause-payment', label: 'Cause', value: 'payment', iconType: 'layers' },
      { id: 'service-checkout', label: 'Service', value: 'checkout', iconType: 'layers' },
    ],
    otherPromotedEvents: otherPromotedEventsData,
    lowerPriorityEvents: acknowledgedEvents,
    onRemediate: action('onRemediate'),
    onRemediateEvent: action('onRemediateEvent'),
    onViewDetails: action('onViewDetails'),
  },
};
