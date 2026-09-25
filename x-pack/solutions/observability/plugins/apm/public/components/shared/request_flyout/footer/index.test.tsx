/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { ActionGroups } from '../../actions_context_menu';
import { RequestFlyoutContextProvider } from '../request_flyout_context';
import type { RequestFlyoutContextValue } from '../request_flyout_context';
import { RequestFlyoutFooter } from '.';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

const mockLink = jest.fn();
jest.mock('../../../../hooks/use_apm_router', () => ({
  useApmRouter: () => ({ link: mockLink }),
}));

const mockUseDiscoverHref = jest.fn();
jest.mock('../../links/discover_links/use_discover_href', () => ({
  useDiscoverHref: (...args: unknown[]) => mockUseDiscoverHref(...args),
}));

// ActionsContextMenu — capture the actions prop so we can inspect it, and
// render the button slot so the "Actions" button lands in the DOM.
const mockActionsContextMenu = jest.fn();
jest.mock('../../actions_context_menu', () => ({
  ActionsContextMenu: ({ actions, button }: { actions: ActionGroups; button: React.ReactNode }) => {
    mockActionsContextMenu({ actions });
    return (
      <div data-test-subj="actionsContextMenuMock">
        {button}
        {actions.flatMap((group) =>
          group.actions.map((action) => (
            <a
              key={action.id}
              data-test-subj={`actionsMenuItem-${action.id}`}
              href={(action as any).href}
            >
              {action.name}
            </a>
          ))
        )}
      </div>
    );
  },
}));

// EuiFlyoutFooter — render children directly so we can see them in the DOM.
jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    EuiFlyoutFooter: ({ children }: { children: React.ReactNode }) => (
      <div data-test-subj="euiFlyoutFooter">{children}</div>
    ),
    useGeneratedHtmlId: () => 'test-html-id',
  };
});

// ebt helpers — no-op in unit tests.
jest.mock('@kbn/ebt-click', () => ({
  EBT_CLICK_ACTIONS: { OPEN_ACTIONS: 'open_actions', OPEN_IN_APM: 'open_in_apm' },
  getEbtProps: () => ({}),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BASE_CONTEXT: RequestFlyoutContextValue = {
  deps: { core: {} as any },
  connection: {
    sourceServiceName: 'frontend',
    sourceLabel: 'frontend',
    targetLabel: 'backend',
    dependencies: [],
  },
  filters: {
    environment: 'ENVIRONMENT_ALL',
    setEnvironment: jest.fn(),
    start: '2024-01-01T00:00:00.000Z',
    end: '2024-01-01T01:00:00.000Z',
    rangeFrom: 'now-1h',
    rangeTo: 'now',
    setRange: jest.fn(),
  },
  refreshToken: 0,
  onRefresh: jest.fn(),
};

function renderComponent(contextOverrides: Partial<RequestFlyoutContextValue> = {}) {
  const ctx: RequestFlyoutContextValue = {
    ...BASE_CONTEXT,
    ...contextOverrides,
    connection: {
      ...BASE_CONTEXT.connection,
      ...contextOverrides.connection,
    },
  };
  return render(
    <RequestFlyoutContextProvider value={ctx}>
      <RequestFlyoutFooter />
    </RequestFlyoutContextProvider>
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('RequestFlyoutFooter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLink.mockReturnValue('/dependencies/overview?dependencyName=db');
    mockUseDiscoverHref.mockReturnValue('/discover?traces');
  });

  it('renders the Actions button', () => {
    renderComponent();

    expect(screen.getByTestId('requestFlyoutActionsButton')).toBeInTheDocument();
    expect(screen.getByTestId('requestFlyoutActionsButton')).toHaveTextContent('Actions');
  });

  it('Actions button is disabled when there is no dependencyName and no discoverHref', () => {
    mockUseDiscoverHref.mockReturnValue(undefined);
    mockLink.mockReturnValue(undefined);

    renderComponent({
      connection: {
        ...BASE_CONTEXT.connection,
        dependencyName: undefined,
      },
    });

    const button = screen.getByTestId('requestFlyoutActionsButton');
    expect(button).toBeDisabled();
  });

  it('Actions button is enabled when discoverHref is available', () => {
    mockUseDiscoverHref.mockReturnValue('/discover?traces');

    renderComponent({
      connection: {
        ...BASE_CONTEXT.connection,
        dependencyName: undefined,
      },
    });

    const button = screen.getByTestId('requestFlyoutActionsButton');
    expect(button).not.toBeDisabled();
  });

  it('includes "Open in APM" menu item when dependencyName is set', () => {
    mockLink.mockReturnValue('/dependencies/overview?dependencyName=postgresql');

    renderComponent({
      connection: {
        ...BASE_CONTEXT.connection,
        dependencyName: 'postgresql',
      },
    });

    expect(screen.getByTestId('actionsMenuItem-openInApm')).toBeInTheDocument();
    expect(screen.getByTestId('actionsMenuItem-openInApm')).toHaveTextContent('Open in APM');
  });

  it('does not include "Open in APM" menu item when dependencyName is not set', () => {
    renderComponent({
      connection: {
        ...BASE_CONTEXT.connection,
        dependencyName: undefined,
      },
    });

    expect(screen.queryByTestId('actionsMenuItem-openInApm')).not.toBeInTheDocument();
  });

  it('includes "Explore traces in Discover" menu item when discoverHref is available', () => {
    mockUseDiscoverHref.mockReturnValue('/discover?traces');

    renderComponent();

    expect(screen.getByTestId('actionsMenuItem-exploreTraces')).toBeInTheDocument();
    expect(screen.getByTestId('actionsMenuItem-exploreTraces')).toHaveTextContent(
      'Explore traces in Discover'
    );
  });

  it('does not include "Explore traces in Discover" when discoverHref is undefined', () => {
    mockUseDiscoverHref.mockReturnValue(undefined);
    mockLink.mockReturnValue('/dependencies/overview?dependencyName=postgresql');

    renderComponent({
      connection: {
        ...BASE_CONTEXT.connection,
        dependencyName: 'postgresql',
      },
    });

    expect(screen.queryByTestId('actionsMenuItem-exploreTraces')).not.toBeInTheDocument();
  });

  it('passes no action groups to ActionsContextMenu when nothing is available', () => {
    mockUseDiscoverHref.mockReturnValue(undefined);
    mockLink.mockReturnValue(undefined);

    renderComponent({
      connection: {
        ...BASE_CONTEXT.connection,
        dependencyName: undefined,
      },
    });

    const [call] = mockActionsContextMenu.mock.calls;
    expect(call[0].actions).toHaveLength(0);
  });
});
