/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import type { AgentName } from '@kbn/apm-types/es_schemas_ui';
import { getSyncLabel, SyncBadge } from '.';

describe('Sync badge', () => {
  describe('getSyncLabel', () => {
    describe.each([
      // Agents that show "blocking" when sync=true
      { agentName: 'nodejs', sync: true, expected: 'blocking', description: 'Nodejs' },
      { agentName: 'nodejs', sync: false, expected: undefined, description: 'Nodejs' },
      { agentName: 'js-base', sync: true, expected: 'blocking', description: 'JS' },
      { agentName: 'js-base', sync: false, expected: undefined, description: 'JS' },
      { agentName: 'rum-js', sync: true, expected: 'blocking', description: 'RUM' },
      { agentName: 'rum-js', sync: false, expected: undefined, description: 'RUM' },
      // Agents that show "async" when sync=false
      { agentName: 'php', sync: true, expected: undefined, description: 'PHP' },
      { agentName: 'php', sync: false, expected: 'async', description: 'PHP' },
      { agentName: 'python', sync: true, expected: undefined, description: 'Python' },
      { agentName: 'python', sync: false, expected: 'async', description: 'Python' },
      { agentName: 'dotnet', sync: true, expected: undefined, description: '.NET' },
      { agentName: 'dotnet', sync: false, expected: 'async', description: '.NET' },
      { agentName: 'iOS/swift', sync: true, expected: undefined, description: 'iOS' },
      { agentName: 'iOS/swift', sync: false, expected: 'async', description: 'iOS' },
      { agentName: 'ruby', sync: true, expected: undefined, description: 'Ruby' },
      { agentName: 'ruby', sync: false, expected: 'async', description: 'Ruby' },
      { agentName: 'java', sync: true, expected: undefined, description: 'Java' },
      { agentName: 'java', sync: false, expected: 'async', description: 'Java' },
      { agentName: 'go', sync: true, expected: undefined, description: 'Go' },
      { agentName: 'go', sync: false, expected: 'async', description: 'Go' },
    ])('$description: agentName=$agentName, sync=$sync', ({ agentName, sync, expected }) => {
      it(`returns ${expected === undefined ? 'undefined' : `"${expected}"`}`, () => {
        expect(getSyncLabel(agentName as AgentName, sync)).toBe(expected);
      });
    });

    describe('OTEL documents without agentName', () => {
      it('does not show badge when agentName is undefined', () => {
        expect(getSyncLabel(undefined, true)).toBeUndefined();
        expect(getSyncLabel(undefined, false)).toBeUndefined();
      });
    });
  });
});

describe('SyncBadge Component', () => {
  describe('Tooltip functionality', () => {
    it('renders badge with tooltip on hover', async () => {
      render(<SyncBadge sync={true} agentName="nodejs" />);
      const badge = screen.getByText('blocking');
      expect(badge).toBeInTheDocument();

      fireEvent.mouseOver(badge);

      await waitFor(() =>
        expect(
          screen.getByText(
            'Indicates whether the span was executed synchronously or asynchronously.'
          )
        ).toBeInTheDocument()
      );
    });

    it('does not render badge when sync is undefined', () => {
      render(<SyncBadge sync={undefined} agentName="nodejs" />);

      expect(screen.queryByText('blocking')).not.toBeInTheDocument();
      expect(screen.queryByText('async')).not.toBeInTheDocument();
    });

    it('does not render badge when nodejs agent has sync=false', () => {
      render(<SyncBadge sync={false} agentName="nodejs" />);
      expect(screen.queryByText('blocking')).not.toBeInTheDocument();
      expect(screen.queryByText('async')).not.toBeInTheDocument();
    });

    it('does not render badge when python agent has sync=true', () => {
      render(<SyncBadge sync={true} agentName="python" />);
      expect(screen.queryByText('blocking')).not.toBeInTheDocument();
      expect(screen.queryByText('async')).not.toBeInTheDocument();
    });
  });

  describe('Badge content', () => {
    describe.each([
      { agentName: 'js-base', sync: true, expected: 'blocking' },
      { agentName: 'php', sync: false, expected: 'async' },
      { agentName: 'dotnet', sync: false, expected: 'async' },
      { agentName: 'ruby', sync: false, expected: 'async' },
      { agentName: 'java', sync: false, expected: 'async' },
      { agentName: 'iOS/swift', sync: false, expected: 'async' },
    ])('$agentName with sync=$sync', ({ agentName, sync, expected }) => {
      it(`shows correct ${expected} badge`, () => {
        render(<SyncBadge sync={sync} agentName={agentName as AgentName} />);
        expect(screen.getByText(expected)).toBeInTheDocument();
      });
    });
  });
});
