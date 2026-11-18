/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook } from '@testing-library/react';
import { RequestFlyoutContextProvider } from '../request_flyout_context';
import type { RequestFlyoutContextValue } from '../request_flyout_context';
import { TEST_CONTEXT } from '../test_utils';
import { useLinksMenuPanels, useRequestFlyoutFooterMenu } from '.';

const mockLink = jest.fn();
jest.mock('../../../../hooks/use_apm_router', () => ({
  useApmRouter: () => ({ link: mockLink }),
}));

const mockUseDiscoverHref = jest.fn();
jest.mock('../../links/discover_links/use_discover_href', () => ({
  useDiscoverHref: (...args: unknown[]) => mockUseDiscoverHref(...args),
}));

function renderMenu(connection: Partial<RequestFlyoutContextValue['connection']> = {}) {
  const value = { ...TEST_CONTEXT, connection: { ...TEST_CONTEXT.connection, ...connection } };
  return renderHook(() => useRequestFlyoutFooterMenu(), {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <RequestFlyoutContextProvider value={value}>{children}</RequestFlyoutContextProvider>
    ),
  }).result.current;
}

const itemNames = (panels: ReturnType<typeof renderMenu>) =>
  panels.flatMap(({ items }) => items.map((item) => ('name' in item ? item.name : undefined)));

describe('useRequestFlyoutFooterMenu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLink.mockReturnValue('/dependencies/overview?dependencyName=postgresql');
    mockUseDiscoverHref.mockReturnValue('/discover?traces');
  });

  it('offers the dependency in APM and its traces in Discover', () => {
    const panels = renderMenu({ dependencyName: 'postgresql' });

    expect(itemNames(panels)).toEqual(['Open in APM', 'Explore traces in Discover']);
  });

  it('links to the dependency overview scoped to the source service', () => {
    renderMenu({ dependencyName: 'postgresql' });

    expect(mockLink).toHaveBeenCalledWith(
      '/dependencies/overview',
      expect.objectContaining({
        query: expect.objectContaining({
          dependencyName: 'postgresql',
          kuery: 'service.name:"frontend"',
        }),
      })
    );
  });

  it('does not offer "Open in APM" without a dependency name', () => {
    const panels = renderMenu({ dependencyName: undefined });

    expect(itemNames(panels)).toEqual(['Explore traces in Discover']);
  });

  it('does not offer "Explore traces in Discover" without a Discover link', () => {
    mockUseDiscoverHref.mockReturnValue(undefined);

    const panels = renderMenu({ dependencyName: 'postgresql' });

    expect(itemNames(panels)).toEqual(['Open in APM']);
  });

  it('has no panels, so no footer, when nothing is available', () => {
    mockUseDiscoverHref.mockReturnValue(undefined);

    expect(renderMenu({ dependencyName: undefined })).toEqual([]);
  });
});

describe('useLinksMenuPanels', () => {
  it('turns links into the items of one panel, with test subjects from the prefix', () => {
    const actions = [{ id: 'open', name: 'Open page', href: '/page' }];

    const { result } = renderHook(() => useLinksMenuPanels(actions, 'myMenu'));

    expect(result.current).toEqual([
      {
        id: 0,
        items: [
          expect.objectContaining({
            name: 'Open page',
            href: '/page',
            'data-test-subj': 'myMenuItem-open',
          }),
        ],
      },
    ]);
  });

  it('keeps the same panels while the actions do not change', () => {
    const actions = [{ id: 'open', name: 'Open page', href: '/page' }];

    const { result, rerender } = renderHook(() => useLinksMenuPanels(actions, 'myMenu'));
    const first = result.current;
    rerender();

    expect(result.current).toBe(first);
  });
});
