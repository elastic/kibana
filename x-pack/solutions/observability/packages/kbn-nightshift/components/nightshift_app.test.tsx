/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { NightshiftApp } from './nightshift_app';
import type { GapsOverview } from './nightshift_app';

const mockGapsOverview: GapsOverview = {
  generated_at: '2024-01-15T10:00:00Z',
  summary: 'Good coverage of services; deployment and infrastructure are largely undocumented.',
  dimensions: [
    {
      id: 'services',
      name: 'Services and applications',
      status: 'known',
      summary: '5 services documented',
    },
    {
      id: 'deployment',
      name: 'Deployment',
      status: 'partial',
      summary: 'CI/CD documented; rollout strategy missing',
    },
    {
      id: 'infrastructure',
      name: 'Infrastructure',
      status: 'missing',
      summary: 'No infrastructure docs found',
    },
  ],
  recommended_connectors: [
    {
      actionTypeId: '.github',
      name: 'GitHub (my-org)',
      rationale: 'No code repository connector configured',
    },
  ],
};

describe('NightshiftApp', () => {
  describe('empty state (no gaps overview)', () => {
    it('renders the title', () => {
      render(<NightshiftApp />);
      expect(screen.getByText('Nightshift')).toBeInTheDocument();
    });

    it('shows the onboarding button when agentBuilder is available', () => {
      const onStartOnboarding = jest.fn();
      render(<NightshiftApp agentBuilderAvailable onStartOnboarding={onStartOnboarding} />);
      expect(screen.getByTestId('nightshiftStartOnboardingButton')).toBeInTheDocument();
    });

    it('hides the onboarding button when agentBuilder is unavailable', () => {
      render(<NightshiftApp agentBuilderAvailable={false} onStartOnboarding={jest.fn()} />);
      expect(screen.queryByTestId('nightshiftStartOnboardingButton')).not.toBeInTheDocument();
    });

    it('fires onStartOnboarding when the button is clicked', async () => {
      const onStartOnboarding = jest.fn();
      render(<NightshiftApp agentBuilderAvailable onStartOnboarding={onStartOnboarding} />);
      await userEvent.click(screen.getByTestId('nightshiftStartOnboardingButton'));
      expect(onStartOnboarding).toHaveBeenCalledTimes(1);
    });
  });

  describe('gaps overview state', () => {
    it('renders the dimension checklist', () => {
      render(<NightshiftApp gapsOverview={mockGapsOverview} />);
      expect(screen.getByTestId('nightshiftGapsOverview')).toBeInTheDocument();
      expect(screen.getByTestId('nightshiftDimensionList')).toBeInTheDocument();
      expect(screen.getByText('Services and applications')).toBeInTheDocument();
      expect(screen.getByText('Deployment')).toBeInTheDocument();
      expect(screen.getByText('Infrastructure')).toBeInTheDocument();
    });

    it('renders the recommended connectors panel', () => {
      render(<NightshiftApp gapsOverview={mockGapsOverview} />);
      expect(screen.getByTestId('nightshiftConnectorList')).toBeInTheDocument();
      expect(screen.getByText('GitHub (my-org)')).toBeInTheDocument();
    });

    it('hides the connectors panel when no connectors are recommended', () => {
      render(<NightshiftApp gapsOverview={{ ...mockGapsOverview, recommended_connectors: [] }} />);
      expect(screen.queryByTestId('nightshiftConnectorList')).not.toBeInTheDocument();
    });

    it('shows the onboarding button in the gaps view when agentBuilder is available', () => {
      const onStartOnboarding = jest.fn();
      render(
        <NightshiftApp
          gapsOverview={mockGapsOverview}
          agentBuilderAvailable
          onStartOnboarding={onStartOnboarding}
        />
      );
      expect(screen.getByTestId('nightshiftStartOnboardingButton')).toBeInTheDocument();
    });
  });
});
