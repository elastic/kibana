/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FlyoutFooterMenuItem } from '@kbn/flyout-template';
import { renderHook } from '@testing-library/react';
import type { MouseEvent } from 'react';
import { useTransactionDetailFlyoutFooterMenu } from '.';

const mockUseTransactionDetailFlyoutLinks = jest.fn();
jest.mock('../hooks/use_transaction_detail_flyout_links', () => ({
  useTransactionDetailFlyoutLinks: () => mockUseTransactionDetailFlyoutLinks(),
}));

function makeLinks(
  overrides: {
    discoverHref?: string;
    openInDiscoverTab?: () => void;
    transactionDetailsHref?: string;
    loading?: boolean;
  } = {}
) {
  const {
    discoverHref = '/app/discover/traces',
    openInDiscoverTab,
    transactionDetailsHref = '/app/apm/services/checkout/transactions/view',
    loading = false,
  } = overrides;

  return {
    loading,
    apm: { transactionDetailsHref },
    discover: { href: discoverHref, openInDiscoverTab },
  };
}

/** The resolved menu-item props these tests assert against (the spread EBT attributes are not on the base type). */
interface ResolvedMenuItem {
  name?: string;
  href?: string;
  onClick?: (event: Partial<MouseEvent>) => void;
  'data-test-subj'?: string;
  'data-ebt-action'?: string;
  'data-ebt-element'?: string;
  'data-ebt-detail'?: string;
}

function renderFooterMenu() {
  return renderHook(() => useTransactionDetailFlyoutFooterMenu());
}

function getItems(): ResolvedMenuItem[] {
  const { result } = renderFooterMenu();
  return result.current.panels[0].items as unknown as ResolvedMenuItem[];
}

function findItem(
  items: FlyoutFooterMenuItem[] | ResolvedMenuItem[],
  dataTestSubj: string
): ResolvedMenuItem | undefined {
  return (items as ResolvedMenuItem[]).find((item) => item['data-test-subj'] === dataTestSubj);
}

describe('useTransactionDetailFlyoutFooterMenu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTransactionDetailFlyoutLinks.mockReturnValue(makeLinks());
  });

  it('enables the actions button and renders Discover and transaction details actions', () => {
    const { result } = renderFooterMenu();
    expect(result.current.hasActions).toBe(true);
    expect(result.current.isLoading).toBe(false);

    const items = result.current.panels[0].items;

    const discoverAction = findItem(
      items,
      'transactionDetailFlyoutActionsMenuItem-openTracesInDiscover'
    );
    expect(discoverAction).toEqual(
      expect.objectContaining({
        href: '/app/discover/traces',
        name: 'Open traces in Discover',
        'data-ebt-action': 'openInDiscover',
        'data-ebt-element': 'transactionDetailFlyoutActionsMenu',
        'data-ebt-detail': 'traces',
      })
    );

    const detailsAction = findItem(
      items,
      'transactionDetailFlyoutActionsMenuItem-openTransactionDetails'
    );
    expect(detailsAction).toEqual(
      expect.objectContaining({
        href: '/app/apm/services/checkout/transactions/view',
        name: 'Open transaction details',
        'data-ebt-action': 'viewSpan',
        'data-ebt-element': 'transactionDetailFlyoutActionsMenu',
        'data-ebt-detail': 'transactionDetails',
      })
    );
  });

  it('keeps the actions button enabled while indices load if transaction details is available', () => {
    mockUseTransactionDetailFlyoutLinks.mockReturnValue({
      loading: true,
      apm: { transactionDetailsHref: '/app/apm/services/checkout/transactions/view' },
      discover: { href: undefined, openInDiscoverTab: undefined },
    });

    const { result } = renderFooterMenu();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.hasActions).toBe(true);

    const items = result.current.panels[0].items;
    expect(
      findItem(items, 'transactionDetailFlyoutActionsMenuItem-openTransactionDetails')
    ).toBeDefined();
    expect(
      findItem(items, 'transactionDetailFlyoutActionsMenuItem-openTracesInDiscover')
    ).toBeUndefined();
  });

  it('shows loading and disables the actions button when no actions are available yet', () => {
    mockUseTransactionDetailFlyoutLinks.mockReturnValue({
      loading: true,
      apm: { transactionDetailsHref: undefined },
      discover: { href: undefined, openInDiscoverTab: undefined },
    });

    const { result } = renderFooterMenu();
    expect(result.current.isLoading).toBe(true);
    expect(result.current.hasActions).toBe(false);
  });

  it('disables the actions button when no actions are available', () => {
    mockUseTransactionDetailFlyoutLinks.mockReturnValue({
      loading: false,
      apm: { transactionDetailsHref: undefined },
      discover: { href: undefined, openInDiscoverTab: undefined },
    });

    const { result } = renderFooterMenu();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.hasActions).toBe(false);
    expect(result.current.panels[0].items).toHaveLength(0);
  });

  it('omits Discover when unavailable and still shows transaction details', () => {
    mockUseTransactionDetailFlyoutLinks.mockReturnValue({
      loading: false,
      apm: { transactionDetailsHref: '/app/apm/services/checkout/transactions/view' },
      discover: { href: undefined, openInDiscoverTab: undefined },
    });

    const items = getItems();

    expect(
      findItem(items, 'transactionDetailFlyoutActionsMenuItem-openTracesInDiscover')
    ).toBeUndefined();
    expect(
      findItem(items, 'transactionDetailFlyoutActionsMenuItem-openTransactionDetails')
    ).toBeDefined();
  });

  it('uses the Discover tab label and onClick when openInDiscoverTab is provided', () => {
    const openInDiscoverTab = jest.fn();
    mockUseTransactionDetailFlyoutLinks.mockReturnValue(makeLinks({ openInDiscoverTab }));

    const discoverAction = findItem(
      getItems(),
      'transactionDetailFlyoutActionsMenuItem-openTracesInDiscover'
    );
    expect(discoverAction?.name).toBe('Open traces in a Discover tab');
    expect(discoverAction?.href).toBe('/app/discover/traces');

    const preventDefault = jest.fn();
    discoverAction?.onClick?.({ button: 0, preventDefault });
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(openInDiscoverTab).toHaveBeenCalledTimes(1);

    discoverAction?.onClick?.({ button: 0, metaKey: true, preventDefault });
    expect(openInDiscoverTab).toHaveBeenCalledTimes(1);
  });
});
