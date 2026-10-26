/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { useSloOverviewFlyout } from './use_slo_overview_flyout';

describe('useSloOverviewFlyout()', () => {
  describe('initial state', () => {
    it('is null by default', () => {
      const { result } = renderHook(() => useSloOverviewFlyout());

      expect(result.current.sloOverviewFlyout).toBeNull();
    });

    it('uses the provided initialState', () => {
      const initial = { serviceName: 'my-service', agentName: 'nodejs' as const };

      const { result } = renderHook(() => useSloOverviewFlyout(initial));

      expect(result.current.sloOverviewFlyout).toEqual(initial);
    });
  });

  describe('openSloOverviewFlyout', () => {
    it('sets the flyout state with serviceName only', () => {
      const { result } = renderHook(() => useSloOverviewFlyout());

      act(() => {
        result.current.openSloOverviewFlyout('checkout');
      });

      expect(result.current.sloOverviewFlyout).toEqual({
        serviceName: 'checkout',
        agentName: undefined,
      });
    });

    it('sets the flyout state with both serviceName and agentName', () => {
      const { result } = renderHook(() => useSloOverviewFlyout());

      act(() => {
        result.current.openSloOverviewFlyout('payments', 'java');
      });

      expect(result.current.sloOverviewFlyout).toEqual({
        serviceName: 'payments',
        agentName: 'java',
      });
    });

    it('overwrites existing state when called a second time', () => {
      const { result } = renderHook(() => useSloOverviewFlyout());

      act(() => {
        result.current.openSloOverviewFlyout('service-one', 'nodejs');
      });
      act(() => {
        result.current.openSloOverviewFlyout('service-two', 'java');
      });

      expect(result.current.sloOverviewFlyout).toEqual({
        serviceName: 'service-two',
        agentName: 'java',
      });
    });
  });

  describe('closeSloOverviewFlyout', () => {
    it('resets flyout state to null', () => {
      const { result } = renderHook(() => useSloOverviewFlyout());

      act(() => {
        result.current.openSloOverviewFlyout('my-service');
      });
      act(() => {
        result.current.closeSloOverviewFlyout();
      });

      expect(result.current.sloOverviewFlyout).toBeNull();
    });

    it('is a no-op when already closed', () => {
      const { result } = renderHook(() => useSloOverviewFlyout());

      act(() => {
        result.current.closeSloOverviewFlyout();
      });

      expect(result.current.sloOverviewFlyout).toBeNull();
    });
  });

  describe('callback stability', () => {
    it('openSloOverviewFlyout reference is stable across state changes', () => {
      const { result } = renderHook(() => useSloOverviewFlyout());
      const openRef = result.current.openSloOverviewFlyout;

      act(() => {
        result.current.openSloOverviewFlyout('my-service');
      });

      expect(result.current.openSloOverviewFlyout).toBe(openRef);
    });

    it('closeSloOverviewFlyout reference is stable across state changes', () => {
      const { result } = renderHook(() => useSloOverviewFlyout());
      const closeRef = result.current.closeSloOverviewFlyout;

      act(() => {
        result.current.openSloOverviewFlyout('my-service');
      });

      expect(result.current.closeSloOverviewFlyout).toBe(closeRef);
    });
  });
});
