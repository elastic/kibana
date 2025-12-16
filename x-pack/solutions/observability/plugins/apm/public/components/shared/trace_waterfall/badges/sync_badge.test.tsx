/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getSyncLabel, SyncBadge } from './sync_badge';
import { isSyncBadgeAgent } from './sync_badge.constants';

describe('Sync badge', () => {
  describe('Nodejs', () => {
    it('shows blocking badge', () => {
      expect(getSyncLabel('nodejs', true)).toBe('blocking');
    });
    it('does not show async badge', () => {
      expect(getSyncLabel('nodejs', false)).toBeUndefined();
    });
  });
  describe('PHP', () => {
    it('does not show blocking badge', () => {
      expect(getSyncLabel('php', true)).toBeUndefined();
    });
    it('shows async badge', () => {
      expect(getSyncLabel('php', false)).toBe('async');
    });
  });
  describe('Python', () => {
    it('does not show blocking badge', () => {
      expect(getSyncLabel('python', true)).toBeUndefined();
    });
    it('shows async badge', () => {
      expect(getSyncLabel('python', false)).toBe('async');
    });
  });
  describe('.NET', () => {
    it('does not show blocking badge', () => {
      expect(getSyncLabel('dotnet', true)).toBeUndefined();
    });
    it('shows async badge', () => {
      expect(getSyncLabel('dotnet', false)).toBe('async');
    });
  });
  describe('iOS', () => {
    it('does not show blocking badge', () => {
      expect(getSyncLabel('iOS/swift', true)).toBeUndefined();
    });
    it('shows async badge', () => {
      expect(getSyncLabel('iOS/swift', false)).toBe('async');
    });
  });
  describe('Ruby', () => {
    it('does not show blocking badge', () => {
      expect(getSyncLabel('ruby', true)).toBeUndefined();
    });
    it('shows async badge', () => {
      expect(getSyncLabel('ruby', false)).toBe('async');
    });
  });
  describe('Java', () => {
    it('does not show blocking badge', () => {
      expect(getSyncLabel('java', true)).toBeUndefined();
    });
    it('shows async badge', () => {
      expect(getSyncLabel('java', false)).toBe('async');
    });
  });
  describe('JS', () => {
    it('shows blocking badge', () => {
      expect(getSyncLabel('js-base', true)).toBe('blocking');
    });
    it('does not show async badge', () => {
      expect(getSyncLabel('js-base', false)).toBeUndefined();
    });
  });
  describe('RUM', () => {
    it('shows blocking badge', () => {
      expect(getSyncLabel('rum-js', true)).toBe('blocking');
    });
    it('does not show async badge', () => {
      expect(getSyncLabel('rum-js', false)).toBeUndefined();
    });
  });

  describe('Go', () => {
    it('does not show blocking badge', () => {
      expect(getSyncLabel('go', true)).toBeUndefined();
    });
    it('shows async badge', () => {
      expect(getSyncLabel('go', false)).toBe('async');
    });
  });

  describe('OTEL documents without agentName', () => {
    it('does not show badge when agentName is undefined', () => {
      expect(getSyncLabel(undefined, true)).toBeUndefined();
      expect(getSyncLabel(undefined, false)).toBeUndefined();
    });
  });
});

describe('SyncBadge Component', () => {
  describe('Tooltip functionality', () => {
    it('renders blocking badge with tooltip for nodejs', async () => {
      const user = userEvent.setup();
      render(<SyncBadge sync={true} agentName="nodejs" />);

      const badge = screen.getByText('blocking');
      expect(badge).toBeInTheDocument();

      await user.hover(badge);
      expect(
        await screen.findByText(
          'Indicates whether the span was executed synchronously or asynchronously.'
        )
      ).toBeInTheDocument();
    });

    it('renders async badge with tooltip for python', async () => {
      const user = userEvent.setup();
      render(<SyncBadge sync={false} agentName="python" />);

      const badge = screen.getByText('async');
      expect(badge).toBeInTheDocument();

      await user.hover(badge);
      expect(
        await screen.findByText(
          'Indicates whether the span was executed synchronously or asynchronously.'
        )
      ).toBeInTheDocument();
    });

    it('renders async badge with tooltip for go', async () => {
      const user = userEvent.setup();
      render(<SyncBadge sync={false} agentName="go" />);

      const badge = screen.getByText('async');
      expect(badge).toBeInTheDocument();

      await user.hover(badge);
      expect(
        await screen.findByText(
          'Indicates whether the span was executed synchronously or asynchronously.'
        )
      ).toBeInTheDocument();
    });

    it('does not render badge when sync is undefined', () => {
      render(<SyncBadge sync={undefined} agentName="nodejs" />);

      expect(screen.queryByText('blocking')).not.toBeInTheDocument();
      expect(screen.queryByText('async')).not.toBeInTheDocument();
    });

    it('does not render badge when label conditions are not met', () => {
      render(<SyncBadge sync={false} agentName="nodejs" />);
      expect(screen.queryByText('blocking')).not.toBeInTheDocument();
      expect(screen.queryByText('async')).not.toBeInTheDocument();

      render(<SyncBadge sync={true} agentName="python" />);
      expect(screen.queryByText('blocking')).not.toBeInTheDocument();
      expect(screen.queryByText('async')).not.toBeInTheDocument();
    });
  });

  describe('Badge content', () => {
    it('shows correct blocking badge for js-base agent', () => {
      render(<SyncBadge sync={true} agentName="js-base" />);
      expect(screen.getByText('blocking')).toBeInTheDocument();
    });

    it('shows correct async badge for php agent', () => {
      render(<SyncBadge sync={false} agentName="php" />);
      expect(screen.getByText('async')).toBeInTheDocument();
    });

    it('shows correct async badge for dotnet agent', () => {
      render(<SyncBadge sync={false} agentName="dotnet" />);
      expect(screen.getByText('async')).toBeInTheDocument();
    });

    it('shows correct async badge for ruby agent', () => {
      render(<SyncBadge sync={false} agentName="ruby" />);
      expect(screen.getByText('async')).toBeInTheDocument();
    });

    it('shows correct async badge for java agent', () => {
      render(<SyncBadge sync={false} agentName="java" />);
      expect(screen.getByText('async')).toBeInTheDocument();
    });

    it('shows correct async badge for iOS/swift agent', () => {
      render(<SyncBadge sync={false} agentName="iOS/swift" />);
      expect(screen.getByText('async')).toBeInTheDocument();
    });
  });
});

describe('isSyncBadgeAgent', () => {
  describe('returns true for supported agents', () => {
    it('returns true for nodejs', () => {
      expect(isSyncBadgeAgent('nodejs')).toBe(true);
    });

    it('returns true for js-base', () => {
      expect(isSyncBadgeAgent('js-base')).toBe(true);
    });

    it('returns true for rum-js', () => {
      expect(isSyncBadgeAgent('rum-js')).toBe(true);
    });

    it('returns true for php', () => {
      expect(isSyncBadgeAgent('php')).toBe(true);
    });

    it('returns true for python', () => {
      expect(isSyncBadgeAgent('python')).toBe(true);
    });

    it('returns true for dotnet', () => {
      expect(isSyncBadgeAgent('dotnet')).toBe(true);
    });

    it('returns true for iOS/swift', () => {
      expect(isSyncBadgeAgent('iOS/swift')).toBe(true);
    });

    it('returns true for ruby', () => {
      expect(isSyncBadgeAgent('ruby')).toBe(true);
    });

    it('returns true for java', () => {
      expect(isSyncBadgeAgent('java')).toBe(true);
    });

    it('returns true for go', () => {
      expect(isSyncBadgeAgent('go')).toBe(true);
    });

    it('returns true for android/java', () => {
      expect(isSyncBadgeAgent('android/java')).toBe(true);
    });
  });

  describe('returns false for unsupported agents', () => {
    it('returns false for unknown agent', () => {
      expect(isSyncBadgeAgent('unknown-agent')).toBe(false);
    });

    it('returns false for opentelemetry', () => {
      expect(isSyncBadgeAgent('opentelemetry')).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(isSyncBadgeAgent('')).toBe(false);
    });

    it('returns false for random string', () => {
      expect(isSyncBadgeAgent('not-an-agent')).toBe(false);
    });
  });
});
