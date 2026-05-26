/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { LowerPriorityEvents } from './lower_priority_events';
import type { EventDocument } from '../hooks/use_fetch_system_overview';

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: () => ({
    services: {
      http: { basePath: { prepend: (path: string) => `/base${path}` } },
    },
  }),
}));

const renderWithIntl = (ui: React.ReactElement) =>
  render(<IntlProvider locale="en">{ui}</IntlProvider>);

const makeEvent = (overrides: Partial<EventDocument> = {}): EventDocument => ({
  '@timestamp': '2026-04-30T19:30:00Z',
  event_id: 'evt-1',
  verdict_id: 'v-1',
  discovery_id: 'd-1',
  discovery_slug: 'slug-1',
  verdict: 'acknowledged',
  title: 'Test event',
  summary: 'Test summary',
  root_cause: 'Test root cause',
  rule_names: ['Rule A'],
  stream_names: ['logs.otel'],
  criticality: 50,
  impact: 'medium',
  recommendations: ['Step 1', 'Step 2'],
  recommended_action: 'monitor',
  last_reviewed_at: '2026-04-30T19:30:00Z',
  ...overrides,
});

describe('LowerPriorityEvents', () => {
  it('renders nothing when events array is empty', () => {
    const { container } = renderWithIntl(<LowerPriorityEvents events={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the table with events', () => {
    const events = [
      makeEvent({ event_id: 'e-1', title: 'Event Alpha', criticality: 80 }),
      makeEvent({ event_id: 'e-2', title: 'Event Beta', criticality: 40 }),
    ];
    renderWithIntl(<LowerPriorityEvents events={events} />);

    expect(screen.getByTestId('sigeventsLowerPriorityEvents')).toBeInTheDocument();
    expect(screen.getByText('Lower priority items to review')).toBeInTheDocument();
    expect(screen.getByText('Event Alpha')).toBeInTheDocument();
    expect(screen.getByText('Event Beta')).toBeInTheDocument();
  });

  it('renders severity badges derived from criticality scores', () => {
    const events = [
      makeEvent({ event_id: 'e-1', criticality: 90 }),
      makeEvent({ event_id: 'e-2', criticality: 70 }),
      makeEvent({ event_id: 'e-3', criticality: 50 }),
      makeEvent({ event_id: 'e-4', criticality: 20 }),
    ];
    renderWithIntl(<LowerPriorityEvents events={events} />);

    expect(screen.getByText('Critical')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
    expect(screen.getByText('Medium')).toBeInTheDocument();
    expect(screen.getByText('Low')).toBeInTheDocument();
  });

  it('renders recommended action badges for escalate, monitor, and resolve', () => {
    const events = [
      makeEvent({ event_id: 'e-1', recommended_action: 'escalate' }),
      makeEvent({ event_id: 'e-2', recommended_action: 'monitor' }),
      makeEvent({ event_id: 'e-3', recommended_action: 'resolve' }),
    ];
    renderWithIntl(<LowerPriorityEvents events={events} />);

    expect(screen.getByText('Escalate')).toBeInTheDocument();
    expect(screen.getByText('Monitor')).toBeInTheDocument();
    expect(screen.getByText('Resolve')).toBeInTheDocument();
  });

  it('opens and closes the detail flyout when an event expand button is clicked', () => {
    const events = [makeEvent({ event_id: 'e-1', title: 'Flyout Event' })];
    renderWithIntl(<LowerPriorityEvents events={events} />);

    // Flyout should not be open initially
    expect(screen.queryByTestId('eventDetailFlyout')).not.toBeInTheDocument();

    // Open flyout
    fireEvent.click(screen.getByTestId('eventExpandRow-e-1'));
    expect(screen.getByTestId('eventDetailFlyout')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Flyout Event' })).toBeInTheDocument();

    // Close by clicking expand again (toggles)
    fireEvent.click(screen.getByTestId('eventExpandRow-e-1'));
    expect(screen.queryByTestId('eventDetailFlyout')).not.toBeInTheDocument();
  });

  it('renders the flyout with summary, root cause, and recommendations', () => {
    const events = [
      makeEvent({
        event_id: 'e-1',
        title: 'Detail Event',
        summary: 'A concise summary',
        root_cause: 'The actual root cause',
        recommendations: ['Do this first', 'Then do this'],
      }),
    ];
    renderWithIntl(<LowerPriorityEvents events={events} />);

    fireEvent.click(screen.getByTestId('eventExpandRow-e-1'));

    expect(screen.getByText('A concise summary')).toBeInTheDocument();
    expect(screen.getByText('The actual root cause')).toBeInTheDocument();
  });

  it('renders stream names in the flyout general info', () => {
    const events = [makeEvent({ event_id: 'e-1', stream_names: ['logs.otel', 'metrics.k8s'] })];
    renderWithIntl(<LowerPriorityEvents events={events} />);

    fireEvent.click(screen.getByTestId('eventExpandRow-e-1'));

    // Expand the collapsed "General information" panel
    fireEvent.click(screen.getByTestId('sigeventsOverviewInfoPanelToggle'));

    expect(screen.getByText('logs.otel, metrics.k8s')).toBeInTheDocument();
  });

  it('renders rule names in the flyout general info panel', () => {
    const events = [makeEvent({ event_id: 'e-1', rule_names: ['Rule X', 'Rule Y'] })];
    renderWithIntl(<LowerPriorityEvents events={events} />);

    fireEvent.click(screen.getByTestId('eventExpandRow-e-1'));

    // Expand the collapsed "General information" panel
    fireEvent.click(screen.getByTestId('sigeventsOverviewInfoPanelToggle'));

    expect(screen.getByText('Rule X, Rule Y')).toBeInTheDocument();
  });

  it('calls onRemediate and keeps flyout open when remediate is triggered', () => {
    const onRemediate = jest.fn();
    const events = [
      makeEvent({
        event_id: 'e-1',
        title: 'Remediation Event',
        recommendations: ['Step 1'],
        recommended_action: 'escalate',
      }),
    ];
    renderWithIntl(<LowerPriorityEvents events={events} onRemediate={onRemediate} />);

    fireEvent.click(screen.getByTestId('eventExpandRow-e-1'));

    // The RecommendationsPlanPanel contains the remediate button
    const flyout = screen.getByTestId('eventDetailFlyout');
    const remediateButton = within(flyout).getByTestId(
      'sigeventsOverviewRecommendationsPlanRemediate'
    );
    fireEvent.click(remediateButton);

    expect(onRemediate).toHaveBeenCalledWith('Remediation Event', 'e-1');
    // Flyout should remain open
    expect(screen.getByTestId('eventDetailFlyout')).toBeInTheDocument();
  });

  it('formats the detected-at date', () => {
    const events = [makeEvent({ event_id: 'e-1', '@timestamp': '2026-04-30T19:30:00Z' })];
    renderWithIntl(<LowerPriorityEvents events={events} />);

    fireEvent.click(screen.getByTestId('eventExpandRow-e-1'));

    // Should render a formatted timestamp (exact format depends on locale)
    expect(screen.getByText(/Detected on/)).toBeInTheDocument();
  });

  it('handles invalid timestamp gracefully', () => {
    const events = [makeEvent({ event_id: 'e-1', '@timestamp': 'not-a-date' })];
    renderWithIntl(<LowerPriorityEvents events={events} />);

    fireEvent.click(screen.getByTestId('eventExpandRow-e-1'));

    // Falls back to raw timestamp string
    expect(screen.getByText('not-a-date')).toBeInTheDocument();
  });

  it('renders the "Go to Significant events" link', () => {
    const events = [makeEvent()];
    renderWithIntl(<LowerPriorityEvents events={events} />);

    expect(screen.getByTestId('sigeventsViewAllKnowledgeIndicators')).toHaveAttribute(
      'href',
      '/base/app/streams/_discovery/knowledge_indicators'
    );
  });

  it('limits table display to 5 events', () => {
    const events = Array.from({ length: 8 }, (_, i) =>
      makeEvent({ event_id: `e-${i}`, title: `Event ${i}`, criticality: i * 10 })
    );
    renderWithIntl(<LowerPriorityEvents events={events} />);

    // EuiBasicTable renders table rows
    const rows = screen.getByTestId('sigeventsLowerPriorityEvents').querySelectorAll('tbody tr');
    expect(rows).toHaveLength(5);
  });

  it('renders without stream_names or rule_names in the flyout detail', () => {
    const events = [makeEvent({ event_id: 'e-1', stream_names: undefined, rule_names: undefined })];
    renderWithIntl(<LowerPriorityEvents events={events} />);

    fireEvent.click(screen.getByTestId('eventExpandRow-e-1'));
    fireEvent.click(screen.getByTestId('sigeventsOverviewInfoPanelToggle'));

    // Should not crash; streams/rules items not rendered
    expect(screen.queryByTestId('eventStreamLink-logs.otel')).not.toBeInTheDocument();
  });

  it('closes the flyout when Escape is pressed', () => {
    const events = [makeEvent({ event_id: 'e-1', title: 'Escape Event' })];
    renderWithIntl(<LowerPriorityEvents events={events} />);

    fireEvent.click(screen.getByTestId('eventExpandRow-e-1'));
    expect(screen.getByTestId('eventDetailFlyout')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByTestId('eventDetailFlyout')).not.toBeInTheDocument();
  });
});
