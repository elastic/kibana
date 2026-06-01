/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { NightshiftApp } from './nightshift_app';

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: () => ({
    services: {
      http: { basePath: { prepend: (path: string) => path } },
    },
  }),
}));

const renderWithIntl = (ui: React.ReactElement) => {
  return render(<IntlProvider locale="en">{ui}</IntlProvider>);
};

describe('NightshiftApp', () => {
  const defaultProps = {
    onRemediate: jest.fn(),
    onViewDetails: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders when state is critical', () => {
    renderWithIntl(<NightshiftApp {...defaultProps} state="critical" />);
    expect(screen.getByTestId('sigeventsOverview')).toBeInTheDocument();
  });

  it('renders with default state (critical)', () => {
    renderWithIntl(<NightshiftApp {...defaultProps} />);
    expect(screen.getByTestId('sigeventsOverview')).toBeInTheDocument();
  });

  it('renders the healthy/no-critical view when state is warning', () => {
    renderWithIntl(<NightshiftApp {...defaultProps} state="warning" />);
    expect(screen.getByTestId('sigeventsOverview')).toBeInTheDocument();
    expect(screen.getByText('You have no critical significant events')).toBeInTheDocument();
  });

  describe('healthy variant', () => {
    it('renders the StatusHeader (no-critical variant) and the 5 default healthy metric cards', () => {
      renderWithIntl(<NightshiftApp {...defaultProps} state="healthy" />);

      expect(screen.getByTestId('sigeventsOverview')).toBeInTheDocument();
      expect(screen.getByTestId('sigeventsOverviewStatusHeader')).toBeInTheDocument();
      expect(screen.getByText('You have no critical significant events')).toBeInTheDocument();

      expect(screen.getByTestId('sigeventsOverviewHealthyMetrics')).toBeInTheDocument();
      expect(screen.getAllByTestId('sigeventsOverviewMetadataIconCard')).toHaveLength(7);

      ['Services', 'Entities', 'Technologies', 'Critical', 'High', 'Medium', 'Low'].forEach(
        (label) => {
          expect(screen.getByText(label)).toBeInTheDocument();
        }
      );
    });

    it('does not render the critical state main event in the healthy state', () => {
      renderWithIntl(<NightshiftApp {...defaultProps} state="healthy" />);
      expect(screen.queryByTestId('sigeventsOverviewMainSignificantEvent')).not.toBeInTheDocument();
      expect(screen.queryByTestId('sigeventsOverviewImpactedCards')).not.toBeInTheDocument();
    });

    it('renders custom healthy metric cards when provided', () => {
      renderWithIntl(
        <NightshiftApp
          {...defaultProps}
          state="healthy"
          healthyMetrics={[
            { id: 'a', label: 'Hosts', value: '12' },
            { id: 'b', label: 'Clusters', value: '3' },
          ]}
        />
      );
      expect(screen.getAllByTestId('sigeventsOverviewMetadataIconCard')).toHaveLength(2);
      expect(screen.getByText('Hosts')).toBeInTheDocument();
      expect(screen.getByText('Clusters')).toBeInTheDocument();
    });
  });

  it('renders the StatusHeader', () => {
    renderWithIntl(<NightshiftApp {...defaultProps} state="critical" />);
    expect(screen.getByTestId('sigeventsOverviewStatusHeader')).toBeInTheDocument();
  });

  it('renders the MainSignificantEvent card', () => {
    renderWithIntl(<NightshiftApp {...defaultProps} state="critical" />);
    expect(screen.getByTestId('sigeventsOverviewMainSignificantEvent')).toBeInTheDocument();
  });

  it('passes blast radius score to the MainSignificantEvent', () => {
    renderWithIntl(<NightshiftApp {...defaultProps} state="critical" blastRadiusScore={95} />);
    expect(screen.getByText('95')).toBeInTheDocument();
  });

  it('passes a custom main event title', () => {
    renderWithIntl(
      <NightshiftApp {...defaultProps} state="critical" mainEventTitle="Custom event title" />
    );
    expect(screen.getByText('Custom event title')).toBeInTheDocument();
  });

  it('renders the default impacted cards between the header and the main event', () => {
    renderWithIntl(<NightshiftApp {...defaultProps} state="critical" />);
    expect(screen.getByTestId('sigeventsOverviewImpactedCards')).toBeInTheDocument();
    expect(screen.getAllByTestId('sigeventsOverviewImpactedCard')).toHaveLength(2);
  });

  it('renders custom impacted cards', () => {
    renderWithIntl(
      <NightshiftApp
        {...defaultProps}
        state="critical"
        impactedCards={[
          { id: 'a', label: 'Service', value: 'service-a' },
          { id: 'b', label: 'Service', value: 'service-b' },
          { id: 'c', label: 'Dropped events', value: '1,234' },
        ]}
      />
    );
    expect(screen.getAllByTestId('sigeventsOverviewImpactedCard')).toHaveLength(3);
    expect(screen.getByText('service-a')).toBeInTheDocument();
    expect(screen.getByText('1,234')).toBeInTheDocument();
  });

  it('does not render the impacted cards section when empty', () => {
    renderWithIntl(<NightshiftApp {...defaultProps} state="critical" impactedCards={[]} />);
    expect(screen.queryByTestId('sigeventsOverviewImpactedCards')).not.toBeInTheDocument();
  });

  it('renders other promoted events in critical state', () => {
    const otherPromotedEvents = [
      {
        raw: {
          '@timestamp': '2026-04-30T19:30:00Z',
          event_id: 'other-1',
          discovery_id: 'd-1',
          discovery_slug: 'slug-1',
          verdict: 'promoted' as const,
          title: 'Other event',
          summary: 'Other summary',
          root_cause: '',
          rule_names: [],
          stream_names: [],
          cause_kis: [],
          criticality: 40,
          recommended_action: 'monitor' as const,
          impact: 'medium' as const,
          recommendations: [],
          verdict_id: 'v-other',
          last_reviewed_at: '2026-04-30T19:30:00Z',
        },
        state: 'warning' as const,
        blastRadiusScore: 40,
        mainEventTitle: 'Other event',
        description: 'Other summary',
        impactedServices: [],
        impactedCards: [],
        severityLabel: 'Medium',
        severityColor: 'primary' as const,
        detailFields: {
          id: 'other-1',
          label: 'Other event',
          subtitle: '',
          summary: 'Other summary',
          rootCause: '',
          recommendations: [],
          recommendedAction: 'monitor' as const,
          criticality: 40,
          ruleNames: [],
          streamNames: [],
          evidences: [],
          dependencyEdges: [],
          causeKis: [],
          timestamp: '2026-04-30T19:30:00Z',
        },
        timestamp: '2026-04-30T19:30:00Z',
      },
    ];
    renderWithIntl(
      <NightshiftApp {...defaultProps} state="critical" otherPromotedEvents={otherPromotedEvents} />
    );
    expect(screen.getByTestId('sigeventsOverviewOtherPromotedEvents')).toBeInTheDocument();
    expect(screen.getByText('Other event')).toBeInTheDocument();
  });

  it('renders lower priority events in healthy state', () => {
    const lowerPriorityEvents = [
      {
        '@timestamp': '2026-04-30T19:30:00Z',
        event_id: 'lpe-1',
        verdict_id: 'v-lpe',
        discovery_id: 'd-lpe',
        discovery_slug: 'slug-lpe',
        verdict: 'acknowledged' as const,
        title: 'Lower priority event',
        summary: 'Summary',
        root_cause: 'Root cause',
        rule_names: [],
        stream_names: [],
        criticality: 30,
        impact: 'low' as const,
        recommendations: [],
        recommended_action: 'monitor' as const,
        last_reviewed_at: '2026-04-30T19:30:00Z',
      },
    ];
    renderWithIntl(
      <NightshiftApp {...defaultProps} state="healthy" lowerPriorityEvents={lowerPriorityEvents} />
    );
    expect(screen.getByTestId('sigeventsLowerPriorityEvents')).toBeInTheDocument();
    expect(screen.getByText('Lower priority event')).toBeInTheDocument();
  });
});
