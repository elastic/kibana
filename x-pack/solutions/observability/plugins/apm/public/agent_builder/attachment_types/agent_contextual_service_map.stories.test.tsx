/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Smoke tests that render the REAL ContextualServiceMapGraph (no mocks) with
 * agent-shaped topology data, via the storybook stories. Complements
 * agent_contextual_service_map.test.tsx, which mocks the graph to test the
 * renderer's routing/props.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { composeStories } from '@storybook/react';
import * as stories from './__stories__/agent_contextual_service_map.stories';

const { DepthTwoTopology, WithAlertAndSloBadges, BidirectionalConnections } =
  composeStories(stories);

describe('AgentContextualServiceMap stories (real graph)', () => {
  it('renders the contextual graph focused on the service with its 1-hop neighborhood', async () => {
    render(<DepthTwoTopology />);

    expect(await screen.findByTestId('contextualServiceMapGraph')).toBeInTheDocument();
    // Focal service and direct connections are visible…
    expect(screen.getByText('checkout')).toBeInTheDocument();
    expect(screen.getByText('frontend')).toBeInTheDocument();
    // …while 2-hop nodes stay collapsed behind expand affordances.
    expect(screen.queryByText('ledger')).not.toBeInTheDocument();
    expect(screen.getAllByTestId('serviceMapExpandHiddenButton').length).toBeGreaterThan(0);
  });

  it('renders alert badges from nodeMetadata', async () => {
    render(<WithAlertAndSloBadges />);

    expect(await screen.findByTestId('contextualServiceMapGraph')).toBeInTheDocument();
    expect(screen.getAllByTestId('serviceMapNodeAlertsBadge').length).toBeGreaterThan(0);
  });

  it('renders bidirectional topologies without throwing', async () => {
    render(<BidirectionalConnections />);

    expect(await screen.findByTestId('contextualServiceMapGraph')).toBeInTheDocument();
  });
});
