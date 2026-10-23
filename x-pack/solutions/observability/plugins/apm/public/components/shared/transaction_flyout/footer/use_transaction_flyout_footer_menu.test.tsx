/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, render, screen } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';
import type { FlyoutFooterMenuCustomItem } from '@kbn/flyout-template';
import React from 'react';
import type { Transaction } from '../../../../../typings/es_schemas/ui/transaction';
import { useLicenseContext } from '../../../../context/license/use_license_context';
import { useProfilingPlugin } from '../../../../hooks/use_profiling_plugin';
import { useTransactionActionMenuSections } from '../../transaction_action_menu/use_transaction_action_menu_sections';
import { useTransactionFlyoutFooterMenu } from './use_transaction_flyout_footer_menu';

jest.mock('../../../../context/apm_plugin/use_apm_plugin_context', () => ({
  useApmPluginContext: () => ({
    uiActions: { getTriggerCompatibleActions: jest.fn().mockResolvedValue([]) },
  }),
}));
jest.mock('../../../../context/license/use_license_context');
jest.mock('../../../../hooks/use_profiling_plugin');
jest.mock('../../transaction_action_menu/use_transaction_action_menu_sections');
jest.mock('../../transaction_action_menu/custom_link_menu_section', () => ({
  CustomLinkMenuSection: ({
    openCreateCustomLinkFlyout,
  }: {
    openCreateCustomLinkFlyout: () => void;
  }) => (
    <button type="button" onClick={openCreateCustomLinkFlyout}>
      Create custom link
    </button>
  ),
}));
jest.mock('../../transaction_action_menu/custom_link_flyout', () => ({
  CustomLinkFlyout: () => null,
}));

const mockUseLicenseContext = useLicenseContext as jest.MockedFunction<typeof useLicenseContext>;
const mockUseProfilingPlugin = useProfilingPlugin as jest.MockedFunction<typeof useProfilingPlugin>;
const mockUseSections = useTransactionActionMenuSections as jest.MockedFunction<
  typeof useTransactionActionMenuSections
>;

const transaction = {
  service: { name: 'my-service' },
  transaction: { id: 'tx-1', name: 'GET /api', type: 'request' },
} as unknown as Transaction;

const sections = [
  [
    {
      key: 'traceDetails',
      title: 'Trace details',
      subtitle: 'View trace logs to get further details.',
      actions: [{ key: 'traceLogs', label: 'Trace logs', href: '/logs', condition: true }],
    },
    {
      key: 'serviceMap',
      title: 'Service map',
      subtitle: 'View service map filtered by this trace.',
      actions: [{ key: 'serviceMap', label: 'Show in service map', href: '/map', condition: true }],
    },
  ],
];

const setLicense = (hasGold: boolean) =>
  mockUseLicenseContext.mockReturnValue({
    isActive: true,
    hasAtLeast: () => hasGold,
  } as unknown as ReturnType<typeof useLicenseContext>);

const renderMenu = (doc: Transaction | undefined, isTransactionLoading = !doc) =>
  renderHook(() => useTransactionFlyoutFooterMenu({ transaction: doc, isTransactionLoading }));

const investigateItem = (panels: ReturnType<typeof renderMenu>['result']['current']['panels']) =>
  panels[0].items[0] as FlyoutFooterMenuCustomItem;

const renderInvestigateMenu = (doc: Transaction | undefined, closeMenu = jest.fn()) => {
  const rendered = renderMenu(doc);
  const item = investigateItem(rendered.result.current.panels);
  render(<EuiThemeProvider>{item.renderItem({ closeMenu })}</EuiThemeProvider>);
  return { ...rendered, closeMenu };
};

describe('useTransactionFlyoutFooterMenu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setLicense(false);
    mockUseProfilingPlugin.mockReturnValue({
      profilingLocators: undefined,
      isLoading: false,
    } as unknown as ReturnType<typeof useProfilingPlugin>);
    mockUseSections.mockReturnValue(sections);
  });

  it('renders the section titles, subtitles, and links in one custom item', () => {
    const { result } = renderInvestigateMenu(transaction);

    expect(result.current.hasActions).toBe(true);
    expect(result.current.panels.map(({ id }) => id)).toEqual([0]);
    expect(investigateItem(result.current.panels).key).toBe('investigate');

    expect(screen.getByRole('heading', { name: 'Trace details' })).toBeInTheDocument();
    expect(screen.getByText('View trace logs to get further details.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Trace logs' })).toHaveAttribute('href', '/logs');
    expect(screen.getByRole('heading', { name: 'Service map' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Show in service map' })).toHaveAttribute(
      'href',
      '/map'
    );
    expect(mockUseSections).toHaveBeenCalledWith(transaction, undefined);
  });

  it('omits custom links and the create flyout without a gold license', () => {
    const { result } = renderMenu(transaction);

    renderInvestigateMenu(transaction);

    expect(screen.queryByRole('button', { name: 'Create custom link' })).not.toBeInTheDocument();
    expect(result.current.customLinkFlyout).toBeNull();
  });

  it('includes custom links with a gold license, and creating one closes the menu and opens the flyout', () => {
    setLicense(true);

    const { result, closeMenu } = renderInvestigateMenu(transaction);

    expect(result.current.customLinkFlyout?.props.isOpen).toBe(false);
    act(() => {
      screen.getByRole('button', { name: 'Create custom link' }).click();
    });

    expect(closeMenu).toHaveBeenCalledTimes(1);
    expect(result.current.customLinkFlyout?.props.isOpen).toBe(true);
  });

  it('is loading with an empty menu until the transaction loads', () => {
    mockUseSections.mockReturnValue([]);

    const { panels, isLoading, hasActions } = renderMenu(undefined).result.current;

    expect(panels).toEqual([{ id: 0, items: [] }]);
    expect(isLoading).toBe(true);
    expect(hasActions).toBe(false);
  });

  it('stops loading and stays disabled when the transaction fails to load', () => {
    setLicense(true);
    mockUseSections.mockReturnValue([]);

    const { isLoading, hasActions, customLinkFlyout } = renderMenu(undefined, false).result.current;

    expect(isLoading).toBe(false);
    expect(hasActions).toBe(false);
    expect(customLinkFlyout).toBeNull();
  });

  it('stays loading while profiling locators load', () => {
    mockUseProfilingPlugin.mockReturnValue({
      profilingLocators: undefined,
      isLoading: true,
    } as unknown as ReturnType<typeof useProfilingPlugin>);

    const { isLoading, hasActions } = renderMenu(transaction).result.current;

    expect(isLoading).toBe(true);
    expect(hasActions).toBe(true);
  });
});
