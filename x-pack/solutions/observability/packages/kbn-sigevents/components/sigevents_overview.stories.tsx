/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import type { EventDocument } from '../hooks/use_fetch_system_overview';
import { SigeventsOverview } from './sigevents_overview';
import {
  makeAcknowledgedEvents,
  makePromotedEventsData,
} from '../__fixtures__/sigevents_test_data';
import { KibanaReactStorybookDecorator } from '../storybook_decorator';

const meta: Meta<typeof SigeventsOverview> = {
  title: 'app/SigeventsOverview/SigeventsOverview',
  component: SigeventsOverview,
  decorators: [KibanaReactStorybookDecorator],
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
type Story = StoryObj<typeof SigeventsOverview>;

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
    healthyMetrics: [
      { id: 'services', label: 'Services', value: '0', iconType: 'package' },
      { id: 'detections', label: 'Detections', value: '0', iconType: 'eye' },
      { id: 'highRisk', label: 'High', value: '0', iconType: 'warning' },
      { id: 'mediumRisk', label: 'Medium', value: '0', iconType: 'warning' },
      { id: 'lowRisk', label: 'Low', value: '0', iconType: 'eye' },
    ],
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

export const Act1WeKnowYourSystem: Story = {
  name: 'Act 1: We Know Your System',
  args: {
    state: 'healthy',
    healthyMetrics: [
      { id: 'services', label: 'Services', value: '3', iconType: 'package' },
      { id: 'detections', label: 'Detections', value: '2', iconType: 'eye' },
      { id: 'highRisk', label: 'High', value: '0', iconType: 'warning' },
      { id: 'mediumRisk', label: 'Medium', value: '1', iconType: 'warning' },
      { id: 'lowRisk', label: 'Low', value: '1', iconType: 'eye' },
    ],
    lowerPriorityEvents: acknowledgedEvents,
    impactedCards: [],
    onRemediate: action('onRemediate'),
    onRemediateEvent: action('onRemediateEvent'),
    onViewDetails: action('onViewDetails'),
  },
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
    severityLabel: mainPromotedEvent?.severityLabel ?? 'Critical',
    severityColor: mainPromotedEvent?.severityColor ?? 'danger',
    impactedServices: mainPromotedEvent?.impactedServices ?? [
      { id: 'payment', label: 'payment', iconType: 'package' },
      { id: 'checkout', label: 'checkout', iconType: 'package' },
    ],
    impactedCards: mainPromotedEvent?.impactedCards ?? [
      { id: 'cause-payment', label: 'Cause', value: 'payment', iconType: 'package' },
      { id: 'service-checkout', label: 'Service', value: 'checkout', iconType: 'package' },
    ],
    otherPromotedEvents: otherPromotedEventsData,
    lowerPriorityEvents: acknowledgedEvents,
    onRemediate: action('onRemediate'),
    onRemediateEvent: action('onRemediateEvent'),
    onViewDetails: action('onViewDetails'),
  },
};
