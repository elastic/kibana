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
import { getAgentSyncValue } from './constants';

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

describe('getAgentSyncValue', () => {
  describe('Elastic agents - sync agents (true)', () => {
    it('returns true for nodejs', () => {
      expect(getAgentSyncValue('nodejs')).toBe(true);
    });

    it('returns true for js-base', () => {
      expect(getAgentSyncValue('js-base')).toBe(true);
    });

    it('returns true for rum-js', () => {
      expect(getAgentSyncValue('rum-js')).toBe(true);
    });
  });

  describe('Elastic agents - async agents (false)', () => {
    it('returns false for php', () => {
      expect(getAgentSyncValue('php')).toBe(false);
    });

    it('returns false for python', () => {
      expect(getAgentSyncValue('python')).toBe(false);
    });

    it('returns false for dotnet', () => {
      expect(getAgentSyncValue('dotnet')).toBe(false);
    });

    it('returns false for iOS/swift', () => {
      expect(getAgentSyncValue('iOS/swift')).toBe(false);
    });

    it('returns false for ruby', () => {
      expect(getAgentSyncValue('ruby')).toBe(false);
    });

    it('returns false for java', () => {
      expect(getAgentSyncValue('java')).toBe(false);
    });

    it('returns false for go', () => {
      expect(getAgentSyncValue('go')).toBe(false);
    });

    it('returns false for android/java', () => {
      expect(getAgentSyncValue('android/java')).toBe(false);
    });
  });

  describe('OpenTelemetry agents - sync languages', () => {
    it('returns true for opentelemetry/nodejs', () => {
      expect(getAgentSyncValue('opentelemetry/nodejs')).toBe(true);
    });

    it('returns true for opentelemetry/webjs', () => {
      expect(getAgentSyncValue('opentelemetry/webjs')).toBe(true);
    });

    it('returns true for otlp/nodejs', () => {
      expect(getAgentSyncValue('otlp/nodejs')).toBe(true);
    });

    it('returns true for otlp/webjs', () => {
      expect(getAgentSyncValue('otlp/webjs')).toBe(true);
    });
  });

  describe('OpenTelemetry agents - async languages', () => {
    it('returns false for opentelemetry/java', () => {
      expect(getAgentSyncValue('opentelemetry/java')).toBe(false);
    });

    it('returns false for opentelemetry/python', () => {
      expect(getAgentSyncValue('opentelemetry/python')).toBe(false);
    });

    it('returns false for opentelemetry/go', () => {
      expect(getAgentSyncValue('opentelemetry/go')).toBe(false);
    });

    it('returns false for opentelemetry/php', () => {
      expect(getAgentSyncValue('opentelemetry/php')).toBe(false);
    });

    it('returns false for opentelemetry/dotnet', () => {
      expect(getAgentSyncValue('opentelemetry/dotnet')).toBe(false);
    });

    it('returns false for opentelemetry/ruby', () => {
      expect(getAgentSyncValue('opentelemetry/ruby')).toBe(false);
    });

    it('returns false for opentelemetry/cpp', () => {
      expect(getAgentSyncValue('opentelemetry/cpp')).toBe(false);
    });

    it('returns false for opentelemetry/rust', () => {
      expect(getAgentSyncValue('opentelemetry/rust')).toBe(false);
    });

    it('returns false for opentelemetry/swift', () => {
      expect(getAgentSyncValue('opentelemetry/swift')).toBe(false);
    });

    it('returns false for opentelemetry/android', () => {
      expect(getAgentSyncValue('opentelemetry/android')).toBe(false);
    });

    it('returns false for opentelemetry/erlang', () => {
      expect(getAgentSyncValue('opentelemetry/erlang')).toBe(false);
    });

    it('returns false for otlp/java', () => {
      expect(getAgentSyncValue('otlp/java')).toBe(false);
    });

    it('returns false for otlp/python', () => {
      expect(getAgentSyncValue('otlp/python')).toBe(false);
    });
  });

  describe('EDOT agents', () => {
    it('returns false for opentelemetry/java/elastic', () => {
      expect(getAgentSyncValue('opentelemetry/java/elastic')).toBe(false);
    });

    it('returns true for opentelemetry/nodejs/elastic', () => {
      expect(getAgentSyncValue('opentelemetry/nodejs/elastic')).toBe(true);
    });

    it('returns false for opentelemetry/python/elastic', () => {
      expect(getAgentSyncValue('opentelemetry/python/elastic')).toBe(false);
    });

    it('returns false for opentelemetry/php/elastic', () => {
      expect(getAgentSyncValue('opentelemetry/php/elastic')).toBe(false);
    });

    it('returns false for opentelemetry/dotnet/elastic', () => {
      expect(getAgentSyncValue('opentelemetry/dotnet/elastic')).toBe(false);
    });
  });

  describe('Unsupported agents return undefined', () => {
    it('returns undefined for unknown agent', () => {
      expect(getAgentSyncValue('unknown-agent')).toBeUndefined();
    });

    it('returns undefined for base opentelemetry without language', () => {
      expect(getAgentSyncValue('opentelemetry')).toBeUndefined();
    });

    it('returns undefined for base otlp without language', () => {
      expect(getAgentSyncValue('otlp')).toBeUndefined();
    });

    it('returns undefined for empty string', () => {
      expect(getAgentSyncValue('')).toBeUndefined();
    });

    it('returns undefined for random string', () => {
      expect(getAgentSyncValue('not-an-agent')).toBeUndefined();
    });
  });
});
