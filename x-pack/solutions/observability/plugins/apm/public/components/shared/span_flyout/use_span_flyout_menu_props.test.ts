/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useOpenInDiscoverLink } from '../links/discover_links/open_in_discover';
import { useSpanFlyoutMenuProps } from './use_span_flyout_menu_props';

jest.mock('../links/discover_links/open_in_discover', () => ({
  useOpenInDiscoverLink: jest.fn(),
}));

const mockUseOpenInDiscoverLink = useOpenInDiscoverLink as jest.MockedFunction<
  typeof useOpenInDiscoverLink
>;

const params = { spanId: 'span-1', rangeFrom: 'now-15m', rangeTo: 'now', kuery: 'a:b' };

describe('useSpanFlyoutMenuProps', () => {
  beforeEach(() => {
    mockUseOpenInDiscoverLink.mockReturnValue({
      href: '/app/discover#/span-1',
      isLoading: false,
      isDisabled: false,
      ebtProps: { 'data-ebt-element': 'spanFlyoutHeader' },
    });
  });

  it('builds the Discover link for the span', () => {
    renderHook(() => useSpanFlyoutMenuProps({ ...params, isSpanLoaded: true }));

    expect(mockUseOpenInDiscoverLink).toHaveBeenCalledWith({
      indexType: 'traces',
      rangeFrom: 'now-15m',
      rangeTo: 'now',
      queryParams: { kuery: 'a:b', spanId: 'span-1', sortDirection: 'DESC' },
      ebt: { element: 'spanFlyoutHeader' },
    });
  });

  it('adds an "Open in Discover" icon action with a tooltip once the span loads', () => {
    const { result } = renderHook(() => useSpanFlyoutMenuProps({ ...params, isSpanLoaded: true }));

    expect(result.current?.trailingActions).toEqual([
      {
        iconType: 'productDiscover',
        href: '/app/discover#/span-1',
        'aria-label': 'Open in Discover',
        toolTipContent: 'Open in Discover',
        isDisabled: false,
        hasAriaDisabled: true,
        'data-test-subj': 'spanFlyoutViewSpanInDiscoverLink',
        'data-ebt-element': 'spanFlyoutHeader',
      },
    ]);
  });

  it('disables the action while the Discover link is loading or unavailable', () => {
    mockUseOpenInDiscoverLink.mockReturnValue({
      href: undefined,
      isLoading: true,
      isDisabled: true,
      ebtProps: {},
    });

    const { result } = renderHook(() => useSpanFlyoutMenuProps({ ...params, isSpanLoaded: true }));

    expect(result.current?.trailingActions?.[0]).toEqual(
      expect.objectContaining({ isDisabled: true, hasAriaDisabled: true })
    );
  });

  it('has no menu actions until the span loads', () => {
    const { result } = renderHook(() => useSpanFlyoutMenuProps({ ...params, isSpanLoaded: false }));

    expect(result.current).toBeUndefined();
  });
});
