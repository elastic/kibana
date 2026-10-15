/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MouseEvent } from 'react';
import { act, renderHook } from '@testing-library/react';
import type { FlyoutFooterMenuItem } from '@kbn/flyout-template';
import type { Transaction } from '../../../../../typings/es_schemas/ui/transaction';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { useLicenseContext } from '../../../../context/license/use_license_context';
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';
import { useCustomLinks } from '../../transaction_action_menu/custom_link_menu_section';
import {
  useExternalTransactionActions,
  useTransactionActionMenuSections,
} from '../../transaction_action_menu/use_transaction_action_menu_sections';
import { useTransactionFlyoutFooterMenu } from './use_transaction_flyout_footer_menu';

jest.mock('../../../../context/apm_plugin/use_apm_plugin_context');
jest.mock('../../../../context/license/use_license_context');
jest.mock('../../../../hooks/use_apm_router', () => ({
  useApmRouter: () => ({ link: (path: string) => `/app/apm${path}` }),
}));
jest.mock('../../../../hooks/use_profiling_plugin', () => ({
  useProfilingPlugin: () => ({ profilingLocators: undefined, isLoading: false }),
}));
jest.mock('../../transaction_action_menu/use_transaction_action_menu_sections');
jest.mock('../../transaction_action_menu/custom_link_menu_section', () => ({
  useCustomLinks: jest.fn(),
}));
jest.mock('../../transaction_action_menu/custom_link_flyout', () => ({
  CustomLinkFlyout: () => null,
}));

const mockUseApmPluginContext = useApmPluginContext as jest.MockedFunction<
  typeof useApmPluginContext
>;
const mockUseLicenseContext = useLicenseContext as jest.MockedFunction<typeof useLicenseContext>;
const mockUseSections = useTransactionActionMenuSections as jest.MockedFunction<
  typeof useTransactionActionMenuSections
>;
const mockUseExternalActions = useExternalTransactionActions as jest.MockedFunction<
  typeof useExternalTransactionActions
>;
const mockUseCustomLinks = useCustomLinks as jest.MockedFunction<typeof useCustomLinks>;

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
      actions: [
        { key: 'serviceMap', label: 'Show in service map', href: '/map', condition: true },
      ],
    },
  ],
];

const setLicense = (hasGold: boolean) =>
  mockUseLicenseContext.mockReturnValue({
    isActive: true,
    hasAtLeast: () => hasGold,
  } as unknown as ReturnType<typeof useLicenseContext>);

const setCanSave = (canSave: boolean) =>
  mockUseApmPluginContext.mockReturnValue({
    core: { application: { capabilities: { apm: { save: canSave } } } },
  } as unknown as ReturnType<typeof useApmPluginContext>);

const renderMenu = (doc: Transaction | undefined) =>
  renderHook(() => useTransactionFlyoutFooterMenu(doc));

const findItem = (items: FlyoutFooterMenuItem[], dataTestSubj: string) =>
  items.find((item) => 'data-test-subj' in item && item['data-test-subj'] === dataTestSubj) as
    | (FlyoutFooterMenuItem & { onClick?: (e?: MouseEvent) => void })
    | undefined;

describe('useTransactionFlyoutFooterMenu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setLicense(false);
    setCanSave(true);
    mockUseSections.mockReturnValue(sections);
    mockUseExternalActions.mockReturnValue([]);
    mockUseCustomLinks.mockReturnValue({ customLinks: [], status: FETCH_STATUS.SUCCESS });
  });

  it('lists one root item per section, each opening a titled sub-panel of its links', () => {
    const { panels, hasActions } = renderMenu(transaction).result.current;

    expect(hasActions).toBe(true);
    expect(panels.map(({ id }) => id)).toEqual([0, 'traceDetails', 'serviceMap']);
    expect(panels[0].items).toEqual([
      expect.objectContaining({
        name: 'Trace details',
        panel: 'traceDetails',
        toolTipContent: 'View trace logs to get further details.',
        'data-test-subj': 'transactionFlyoutActionsMenuSection-traceDetails',
      }),
      expect.objectContaining({ name: 'Service map', panel: 'serviceMap' }),
    ]);
    expect(panels[1]).toEqual({
      id: 'traceDetails',
      title: 'Trace details',
      items: [
        expect.objectContaining({
          name: 'Trace logs',
          href: '/logs',
          'data-test-subj': 'transactionFlyoutActionsMenuItem-traceLogs',
        }),
      ],
    });
  });

  it('lists external actions after a separator and passes modified clicks through to the href', () => {
    const onClick = jest.fn();
    mockUseExternalActions.mockReturnValue([
      { id: 'ext', name: 'External action', href: '/external', onClick },
    ]);

    const rootItems = renderMenu(transaction).result.current.panels[0].items;

    expect(rootItems[2]).toEqual(expect.objectContaining({ isSeparator: true }));
    const item = findItem(rootItems, 'transactionFlyoutActionsMenuItem-external-ext');
    expect(item).toEqual(expect.objectContaining({ name: 'External action', href: '/external' }));

    const modifiedClick = { button: 0, metaKey: true, preventDefault: jest.fn() };
    item?.onClick?.(modifiedClick as unknown as MouseEvent);
    expect(onClick).not.toHaveBeenCalled();
    expect(modifiedClick.preventDefault).not.toHaveBeenCalled();

    const plainClick = { button: 0, preventDefault: jest.fn() };
    item?.onClick?.(plainClick as unknown as MouseEvent);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(plainClick.preventDefault).toHaveBeenCalled();
  });

  it('omits the custom links panel and skips the fetch without a gold license', () => {
    const { panels, customLinkFlyout } = renderMenu(transaction).result.current;

    expect(mockUseCustomLinks).toHaveBeenCalledWith(transaction, { isEnabled: false });
    expect(panels.find(({ id }) => id === 'customLinks')).toBeUndefined();
    expect(customLinkFlyout).toBeNull();
  });

  it('lists up to five custom links, then create and manage, with a gold license', () => {
    setLicense(true);
    mockUseCustomLinks.mockReturnValue({
      customLinks: Array.from({ length: 6 }, (_, i) => ({
        id: `link-${i}`,
        label: `Link ${i}`,
        url: `https://example.com/${i}`,
      })),
      status: FETCH_STATUS.SUCCESS,
    });

    const { result } = renderMenu(transaction);
    const { panels, customLinkFlyout } = result.current;

    expect(mockUseCustomLinks).toHaveBeenCalledWith(transaction, { isEnabled: true });
    expect(panels[0].items).toContainEqual(
      expect.objectContaining({ name: 'Custom Links', panel: 'customLinks' })
    );

    const customLinksPanel = panels.find(({ id }) => id === 'customLinks')!;
    expect(customLinksPanel.title).toBe('Custom Links');
    const linkItems = customLinksPanel.items.filter(
      (item) => 'target' in item && item.target === '_blank'
    );
    expect(linkItems).toHaveLength(5);
    expect(linkItems[0]).toEqual(
      expect.objectContaining({ name: 'Link 0', href: 'https://example.com/0', target: '_blank' })
    );

    const create = findItem(customLinksPanel.items, 'apmCustomLinkToolbarCreateButton');
    expect(create).toEqual(expect.objectContaining({ name: 'Create custom link', disabled: false }));
    expect(findItem(customLinksPanel.items, 'transactionFlyoutActionsMenuItem-manageCustomLinks'))
      .toEqual(expect.objectContaining({ href: '/app/apm/settings/custom-links' }));

    expect(customLinkFlyout?.props.isOpen).toBe(false);
    act(() => create?.onClick?.());
    expect(result.current.customLinkFlyout?.props.isOpen).toBe(true);
  });

  it('disables creating a custom link without the save capability', () => {
    setLicense(true);
    setCanSave(false);

    const customLinksPanel = renderMenu(transaction).result.current.panels.find(
      ({ id }) => id === 'customLinks'
    )!;

    expect(findItem(customLinksPanel.items, 'apmCustomLinkToolbarCreateButton')).toEqual(
      expect.objectContaining({
        disabled: true,
        toolTipContent: expect.stringContaining('permission'),
      })
    );
  });

  it('shows a disabled loading item while custom links load', () => {
    setLicense(true);
    mockUseCustomLinks.mockReturnValue({ customLinks: [], status: FETCH_STATUS.LOADING });

    const customLinksPanel = renderMenu(transaction).result.current.panels.find(
      ({ id }) => id === 'customLinks'
    )!;

    expect(customLinksPanel.items[0]).toEqual(
      expect.objectContaining({
        name: 'Loading…',
        disabled: true,
        'data-test-subj': 'transactionFlyoutActionsMenuCustomLinksLoading',
      })
    );
  });

  it('is loading with an empty root panel until the transaction loads', () => {
    mockUseSections.mockReturnValue([]);

    const { panels, isLoading, hasActions } = renderMenu(undefined).result.current;

    expect(panels).toEqual([{ id: 0, items: [] }]);
    expect(isLoading).toBe(true);
    expect(hasActions).toBe(false);
  });
});
