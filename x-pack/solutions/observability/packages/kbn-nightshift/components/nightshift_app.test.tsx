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
import type { GapsReport } from './nightshift_app';

const mockGapsReport: GapsReport = {
  title: 'Knowledge gaps',
  updated_at: '2024-01-15T10:00:00Z',
  content: `# Knowledge gaps

## Highest priority

- **Deployment** — Rollout strategy is not documented.
- **Infrastructure** — Cluster ownership is unclear.`,
};

describe('NightshiftApp', () => {
  describe('empty state', () => {
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

  describe('gaps report flyout', () => {
    it('shows the gaps button when a report is available', () => {
      render(<NightshiftApp gapsReport={mockGapsReport} />);
      expect(screen.getByTestId('nightshiftViewGapsButton')).toBeInTheDocument();
    });

    it('hides the gaps button when no report is available', () => {
      render(<NightshiftApp />);
      expect(screen.queryByTestId('nightshiftViewGapsButton')).not.toBeInTheDocument();
    });

    it('opens the gaps report in a flyout', async () => {
      render(<NightshiftApp gapsReport={mockGapsReport} />);
      await userEvent.click(screen.getByTestId('nightshiftViewGapsButton'));
      expect(screen.getByTestId('nightshiftGapsFlyout')).toBeInTheDocument();
      expect(screen.getByTestId('nightshiftGapsMarkdown')).toHaveTextContent(
        'Rollout strategy is not documented'
      );
    });

    it('starts a gap-closing chat from the flyout', async () => {
      const onStartGapClosing = jest.fn();
      render(
        <NightshiftApp
          gapsReport={mockGapsReport}
          agentBuilderAvailable
          onStartGapClosing={onStartGapClosing}
        />
      );
      await userEvent.click(screen.getByTestId('nightshiftViewGapsButton'));
      await userEvent.click(screen.getByTestId('nightshiftCloseGapsButton'));
      expect(onStartGapClosing).toHaveBeenCalledTimes(1);
      expect(screen.queryByTestId('nightshiftGapsFlyout')).not.toBeInTheDocument();
    });
  });

  describe('common connector suggestions', () => {
    it('renders missing connector types', () => {
      render(<NightshiftApp installedConnectorActionTypeIds={[]} />);
      expect(screen.getByTestId('nightshiftMissingConnectors')).toBeInTheDocument();
      expect(screen.getByText('Slack')).toBeInTheDocument();
      expect(screen.getByText('PagerDuty')).toBeInTheDocument();
      expect(screen.getByText('GitHub')).toBeInTheDocument();
    });

    it('filters connector types that already have a connector', () => {
      render(<NightshiftApp installedConnectorActionTypeIds={['.slack_api', '.pagerduty']} />);
      expect(screen.queryByText('Slack')).not.toBeInTheDocument();
      expect(screen.queryByText('PagerDuty')).not.toBeInTheDocument();
      expect(screen.getByText('Jira')).toBeInTheDocument();
    });

    it('hides the connector panel when all common types are configured', () => {
      render(
        <NightshiftApp
          installedConnectorActionTypeIds={[
            '.slack',
            '.teams',
            '.pagerduty',
            '.jira',
            '.servicenow',
            '.github',
            '.webhook',
          ]}
        />
      );
      expect(screen.queryByTestId('nightshiftMissingConnectors')).not.toBeInTheDocument();
    });
  });
});
