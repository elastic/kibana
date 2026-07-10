/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { IntlProvider } from 'react-intl';
import type { SignificantEvent } from '@kbn/significant-events-schema';
import { NightshiftApp } from './nightshift_app';

const mockEvent = (overrides: Partial<SignificantEvent> = {}): SignificantEvent => ({
  '@timestamp': new Date().toISOString(),
  created_at: new Date().toISOString(),
  event_id: 'evt-1',
  discovery_slug: 'disc-1',
  status: 'promoted',
  stream_names: ['service-a', 'service-b'],
  title: 'Test significant event',
  summary: 'Something happened',
  root_cause: 'Root cause text',
  criticality: 80,
  confidence: 0.9,
  recommendations: ['Fix it'],
  ...overrides,
});

function renderWithIntl(ui: React.ReactElement) {
  return render(<IntlProvider locale="en">{ui}</IntlProvider>);
}

describe('NightshiftApp', () => {
  it('renders hero message when events need action', () => {
    renderWithIntl(
      <NightshiftApp events={[mockEvent()]} isLoading={false} />
    );
    expect(screen.getByText(/1 significant event need/i)).toBeInTheDocument();
  });

  it('renders summary cards with correct counts', () => {
    const events = [
      mockEvent({ event_id: '1', status: 'promoted' }),
      mockEvent({ event_id: '2', status: 'acknowledged' }),
      mockEvent({ event_id: '3', status: 'resolved' }),
    ];
    renderWithIntl(<NightshiftApp events={events} isLoading={false} />);
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('filters events by active tab', () => {
    const events = [
      mockEvent({ event_id: '1', status: 'promoted', title: 'Active event' }),
      mockEvent({ event_id: '2', status: 'resolved', title: 'Resolved event' }),
    ];
    renderWithIntl(<NightshiftApp events={events} isLoading={false} />);

    expect(screen.getByText('Active event')).toBeInTheDocument();
    expect(screen.queryByText('Resolved event')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Resolved'));
    expect(screen.getByText('Resolved event')).toBeInTheDocument();
    expect(screen.queryByText('Active event')).not.toBeInTheDocument();
  });

  it('renders blast radius badges from stream_names', () => {
    const events = [
      mockEvent({ event_id: '1', stream_names: ['service-a', 'service-b'] }),
      mockEvent({ event_id: '2', stream_names: ['service-a', 'service-c'] }),
    ];
    renderWithIntl(<NightshiftApp events={events} isLoading={false} />);
    expect(screen.getByText('service-a 2')).toBeInTheDocument();
  });

  it('shows empty state when no events', () => {
    renderWithIntl(<NightshiftApp events={[]} isLoading={false} />);
    expect(screen.getByText('No significant events found')).toBeInTheDocument();
  });

  it('calls onEventClick when an event is clicked', () => {
    const onEventClick = jest.fn();
    const event = mockEvent();
    renderWithIntl(
      <NightshiftApp events={[event]} isLoading={false} onEventClick={onEventClick} />
    );
    fireEvent.click(screen.getByText('Test significant event'));
    expect(onEventClick).toHaveBeenCalledWith(event);
  });
});
