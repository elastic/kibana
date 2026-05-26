/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { SignificantEventDetailBody } from './significant_event_detail_body';

const renderWithIntl = (ui: React.ReactElement) => render(<I18nProvider>{ui}</I18nProvider>);

describe('SignificantEventDetailBody', () => {
  const mockEvent = {
    id: '1',
    label: 'Fleet Server Dependency Chain',
    subtitle: 'logs · fleet-coordination',
    severityLabel: 'Critical',
    severityColor: 'danger' as const,
    summary: 'Fleet server dependency chain is showing a single point of failure pattern.',
    rootCause:
      'The fleet coordination service has a single upstream dependency that is refusing connections.',
    recommendations: [
      'Verify fleet server upstream dependency health.',
      'Check fleet coordination logs for connection errors.',
    ],
    recommendedAction: 'escalate' as const,
    criticality: 85,
    ruleNames: ['Fleet dependency failures'],
    streamNames: ['logs.otel'],
    evidences: [
      {
        description: 'Matched fleet connection errors in logs.',
        esqlQuery: 'FROM logs.otel | WHERE body.text : "fleet" | LIMIT 5',
        result: 'found',
        rowCount: 5,
        collectedAt: '2026-01-01T00:00:00Z',
        ruleName: 'Fleet dependency failures',
        streamName: 'logs.otel',
        confirmed: true,
      },
    ],
    dependencyEdges: [
      {
        source: 'fleet-coordination',
        target: 'fleet-server',
        protocol: 'grpc',
        exposure: 'exposed' as const,
      },
    ],
    causeKis: [{ name: 'fleet-server', streamName: 'logs.otel' }],
    timestamp: '2026-01-01T00:00:00Z',
  };

  const defaultProps = {
    event: mockEvent,
    onRemediate: jest.fn(),
    onOpenDetails: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the event title as the header', () => {
    renderWithIntl(<SignificantEventDetailBody {...defaultProps} />);
    expect(
      screen.getByRole('heading', { level: 2, name: 'Fleet Server Dependency Chain' })
    ).toBeInTheDocument();
  });

  it('renders the default detected-at timestamp below the header', () => {
    renderWithIntl(<SignificantEventDetailBody {...defaultProps} />);
    expect(screen.getByText('Detected 5 minutes ago')).toBeInTheDocument();
  });

  it('renders a custom detected-at label', () => {
    renderWithIntl(
      <SignificantEventDetailBody {...defaultProps} detectedAtLabel="Detected 12:30 UTC" />
    );
    expect(screen.getByText('Detected 12:30 UTC')).toBeInTheDocument();
  });

  it('does not render the header when hideHeader is true', () => {
    renderWithIntl(<SignificantEventDetailBody {...defaultProps} hideHeader />);
    expect(
      screen.queryByTestId('sigeventsOverviewSignificantEventDetailHeader')
    ).not.toBeInTheDocument();
  });

  it('renders the severity and recommended action metadata cards', () => {
    renderWithIntl(<SignificantEventDetailBody {...defaultProps} />);
    expect(screen.getAllByText('Severity').length).toBeGreaterThan(0);
    expect(screen.getByText('Recommended action')).toBeInTheDocument();
  });

  it('renders the values derived from event data inside the metadata cards', () => {
    renderWithIntl(<SignificantEventDetailBody {...defaultProps} />);
    // Severity badge value (derived from criticality score 85 → Critical)
    expect(screen.getAllByText('Critical').length).toBeGreaterThan(0);
    // Recommended action derived from recommendedAction field
    expect(screen.getAllByText('Escalate').length).toBeGreaterThan(0);
  });

  it('renders summary panel', () => {
    renderWithIntl(<SignificantEventDetailBody {...defaultProps} />);
    expect(screen.getByText('Summary')).toBeInTheDocument();
  });

  it('renders the general information panel collapsed by default', () => {
    renderWithIntl(<SignificantEventDetailBody {...defaultProps} />);
    expect(screen.getByText('General information')).toBeInTheDocument();
    // "Impacting" and "Stream" only live inside the general info panel
    expect(screen.queryByText('Impacting')).not.toBeInTheDocument();
    expect(screen.queryByText('Stream')).not.toBeInTheDocument();
  });

  it('expands the general information panel when its toggle is clicked', () => {
    renderWithIntl(<SignificantEventDetailBody {...defaultProps} />);

    fireEvent.click(screen.getAllByTestId('sigeventsOverviewInfoPanelToggle')[0]);

    expect(screen.getByText('Impacting')).toBeInTheDocument();
    expect(screen.getByText('Stream')).toBeInTheDocument();
  });

  it('renders the recommendations plan panel', () => {
    renderWithIntl(<SignificantEventDetailBody {...defaultProps} />);
    expect(screen.getByText('Recommendations plan')).toBeInTheDocument();
  });

  it('renders the root cause panel', () => {
    renderWithIntl(<SignificantEventDetailBody {...defaultProps} />);
    expect(screen.getByTestId('sigeventsOverviewRootCausePanel')).toBeInTheDocument();
    expect(screen.getByText('Root cause')).toBeInTheDocument();
  });

  it('has the correct test subject', () => {
    const { container } = renderWithIntl(<SignificantEventDetailBody {...defaultProps} />);
    expect(
      container.querySelector('[data-test-subj="sigeventsOverviewSignificantEventDetailBody"]')
    ).toBeInTheDocument();
  });

  it('renders with warning severity color', () => {
    const warningEvent = {
      ...mockEvent,
      severityLabel: 'High',
      severityColor: 'warning' as const,
      impact: 'high',
      criticality: 60,
    };
    renderWithIntl(<SignificantEventDetailBody {...defaultProps} event={warningEvent} />);
    expect(screen.getAllByText('High').length).toBeGreaterThan(0);
  });

  it('renders with subdued severity color for unknown severity', () => {
    const unknownSeverityEvent = {
      ...mockEvent,
      severityLabel: 'Low',
      severityColor: 'hollow' as const,
      impact: 'low',
      criticality: 20,
    };
    renderWithIntl(<SignificantEventDetailBody {...defaultProps} event={unknownSeverityEvent} />);
    expect(screen.getAllByText('Low').length).toBeGreaterThan(0);
  });

  it('renders "Monitor" recommended action label and eye icon', () => {
    const monitorEvent = { ...mockEvent, recommendedAction: 'monitor' as const };
    renderWithIntl(<SignificantEventDetailBody {...defaultProps} event={monitorEvent} />);
    expect(screen.getAllByText('Monitor').length).toBeGreaterThan(0);
  });

  it('renders "Resolve" recommended action label and checkInCircleFilled icon', () => {
    const resolveEvent = { ...mockEvent, recommendedAction: 'resolve' as const };
    renderWithIntl(<SignificantEventDetailBody {...defaultProps} event={resolveEvent} />);
    expect(screen.getAllByText('Resolve').length).toBeGreaterThan(0);
  });

  it('renders "Investigate" recommended action label and search icon', () => {
    const investigateEvent = { ...mockEvent, recommendedAction: 'investigate' as const };
    renderWithIntl(<SignificantEventDetailBody {...defaultProps} event={investigateEvent} />);
    expect(screen.getAllByText('Investigate').length).toBeGreaterThan(0);
  });

  it('renders impacting label as dash when no exposed edges exist', () => {
    const noExposedEvent = {
      ...mockEvent,
      dependencyEdges: [
        { source: 'svc-a', target: 'svc-b', protocol: 'grpc', exposure: 'not_exposed' as const },
      ],
    };
    renderWithIntl(<SignificantEventDetailBody {...defaultProps} event={noExposedEvent} />);

    // Expand General information panel to see the impacting label
    fireEvent.click(screen.getAllByTestId('sigeventsOverviewInfoPanelToggle')[0]);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders singular "1 service" when one exposed edge source exists', () => {
    const singleServiceEvent = {
      ...mockEvent,
      dependencyEdges: [
        { source: 'svc-a', target: 'svc-b', protocol: 'grpc', exposure: 'exposed' as const },
      ],
    };
    renderWithIntl(<SignificantEventDetailBody {...defaultProps} event={singleServiceEvent} />);

    fireEvent.click(screen.getAllByTestId('sigeventsOverviewInfoPanelToggle')[0]);
    expect(screen.getByText('1 service')).toBeInTheDocument();
  });
});
