/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { OtherPromotedEvents } from './other_promoted_events';
import type { LatestSignificantEventData } from '../hooks/use_fetch_latest_significant_event';

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: () => ({
    services: {
      http: { basePath: { prepend: (path: string) => path } },
    },
  }),
}));

const renderWithIntl = (ui: React.ReactElement) =>
  render(<IntlProvider locale="en">{ui}</IntlProvider>);

const makeEvent = (
  overrides: Partial<LatestSignificantEventData> = {}
): LatestSignificantEventData => ({
  raw: {
    '@timestamp': '2026-04-30T19:30:00Z',
    event_id: 'evt-1',
    discovery_id: 'd-1',
    discovery_slug: 'slug-1',
    verdict: 'promoted',
    title: 'Test event',
    summary: 'Test summary',
    root_cause: 'Root cause',
    rule_names: ['Rule A'],
    stream_names: ['logs.otel'],
    cause_kis: [],
    criticality: 70,
    recommended_action: 'escalate',
    impact: 'high',
    recommendations: [],
    verdict_id: 'v-1',
    last_reviewed_at: '2026-04-30T19:30:00Z',
  },
  state: 'warning',
  blastRadiusScore: 70,
  mainEventTitle: 'Test event',
  description: 'Test description',
  impactedServices: [],
  impactedCards: [],
  severityLabel: 'High',
  severityColor: 'warning',
  detailFields: {
    id: 'evt-1',
    label: 'Test event',
    subtitle: 'logs.otel',
    summary: 'Test summary',
    rootCause: 'Root cause',
    recommendations: [],
    recommendedAction: 'escalate',
    criticality: 70,
    ruleNames: ['Rule A'],
    streamNames: ['logs.otel'],
    evidences: [],
    dependencyEdges: [],
    causeKis: [],
    timestamp: '2026-04-30T19:30:00Z',
  },
  timestamp: '2026-04-30T19:30:00Z',
  ...overrides,
});

describe('OtherPromotedEvents', () => {
  it('renders the section heading', () => {
    renderWithIntl(<OtherPromotedEvents events={[makeEvent()]} />);
    expect(screen.getByTestId('sigeventsOverviewOtherPromotedEvents')).toBeInTheDocument();
    expect(
      screen.getByText('Additional significant events that were promoted')
    ).toBeInTheDocument();
  });

  it('renders nothing when there are no events', () => {
    const { container } = renderWithIntl(<OtherPromotedEvents events={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders each event as a row with severity and recommended action badges', () => {
    const events = [
      makeEvent({
        mainEventTitle: 'Payment failures',
        severityLabel: 'Critical',
        severityColor: 'danger',
        blastRadiusScore: 90,
        raw: {
          ...makeEvent().raw,
          event_id: 'e-1',
          recommended_action: 'escalate',
        },
      }),
      makeEvent({
        mainEventTitle: 'Frontend errors',
        severityLabel: 'Medium',
        severityColor: 'primary',
        blastRadiusScore: 50,
        raw: {
          ...makeEvent().raw,
          event_id: 'e-2',
          recommended_action: 'monitor',
        },
      }),
    ];
    renderWithIntl(<OtherPromotedEvents events={events} />);

    expect(screen.getByText('Payment failures')).toBeInTheDocument();
    expect(screen.getByText('Frontend errors')).toBeInTheDocument();
    expect(screen.getByText('Critical')).toBeInTheDocument();
    expect(screen.getByText('Medium')).toBeInTheDocument();
    expect(screen.getByText('Escalate')).toBeInTheDocument();
    expect(screen.getByText('Monitor')).toBeInTheDocument();
  });

  it('opens a detail flyout when an event row is expanded and toggles closed again', () => {
    const events = [makeEvent({ mainEventTitle: 'Payment failures' })];
    renderWithIntl(<OtherPromotedEvents events={events} />);

    expect(screen.queryByTestId('otherPromotedEventDetailFlyout')).not.toBeInTheDocument();

    const expandBtn = screen.getByTestId('otherPromotedEventExpandRow-evt-1');
    fireEvent.click(expandBtn);
    expect(screen.getByTestId('otherPromotedEventDetailFlyout')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('otherPromotedEventExpandRow-evt-1'));
    expect(screen.queryByTestId('otherPromotedEventDetailFlyout')).not.toBeInTheDocument();
  });

  it('opens the flyout when clicking the title link', () => {
    const events = [makeEvent({ mainEventTitle: 'Payment failures' })];
    renderWithIntl(<OtherPromotedEvents events={events} />);

    fireEvent.click(screen.getByTestId('otherPromotedEventTitleLink-evt-1'));
    expect(screen.getByTestId('otherPromotedEventDetailFlyout')).toBeInTheDocument();
  });

  it('closes the flyout when Escape is pressed', () => {
    const events = [makeEvent({ mainEventTitle: 'Payment failures' })];
    renderWithIntl(<OtherPromotedEvents events={events} />);

    fireEvent.click(screen.getByTestId('otherPromotedEventExpandRow-evt-1'));
    expect(screen.getByTestId('otherPromotedEventDetailFlyout')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByTestId('otherPromotedEventDetailFlyout')).not.toBeInTheDocument();
  });
});
