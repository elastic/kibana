/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { useShowTimeline } from './use_show_timeline';

const mockUseLocation = jest.fn().mockReturnValue({ pathname: '/overview' });
jest.mock('react-router-dom', () => {
  const original = jest.requireActual('react-router-dom');
  return {
    ...original,
    useLocation: () => mockUseLocation(),
  };
});

const mockedUseIsGroupedNavigationEnabled = jest.fn();

jest.mock('../../components/navigation/helpers', () => ({
  useIsGroupedNavigationEnabled: () => mockedUseIsGroupedNavigationEnabled(),
}));

describe('use show timeline', () => {
  describe('useIsGroupedNavigationEnabled false', () => {
    beforeAll(() => {
      mockedUseIsGroupedNavigationEnabled.mockReturnValue(false);
    });

    it('shows timeline for routes on default', async () => {
      await act(async () => {
        const { result, waitForNextUpdate } = renderHook(() => useShowTimeline());
        await waitForNextUpdate();
        const showTimeline = result.current;
        expect(showTimeline).toEqual([true]);
      });
    });

    it('hides timeline for blacklist routes', async () => {
      mockUseLocation.mockReturnValueOnce({ pathname: '/rules/create' });
      await act(async () => {
        const { result, waitForNextUpdate } = renderHook(() => useShowTimeline());
        await waitForNextUpdate();
        const showTimeline = result.current;
        expect(showTimeline).toEqual([false]);
      });
    });
    it('shows timeline for partial blacklist routes', async () => {
      mockUseLocation.mockReturnValueOnce({ pathname: '/rules' });
      await act(async () => {
        const { result, waitForNextUpdate } = renderHook(() => useShowTimeline());
        await waitForNextUpdate();
        const showTimeline = result.current;
        expect(showTimeline).toEqual([true]);
      });
    });
    it('hides timeline for sub blacklist routes', async () => {
      mockUseLocation.mockReturnValueOnce({ pathname: '/administration/policy' });
      await act(async () => {
        const { result, waitForNextUpdate } = renderHook(() => useShowTimeline());
        await waitForNextUpdate();
        const showTimeline = result.current;
        expect(showTimeline).toEqual([false]);
      });
    });
  });

  describe('useIsGroupedNavigationEnabled true', () => {
    beforeAll(() => {
      mockedUseIsGroupedNavigationEnabled.mockReturnValue(true);
    });

    it('shows timeline for routes on default', async () => {
      await act(async () => {
        const { result, waitForNextUpdate } = renderHook(() => useShowTimeline());
        await waitForNextUpdate();
        const showTimeline = result.current;
        expect(showTimeline).toEqual([true]);
      });
    });

    it('hides timeline for blacklist routes', async () => {
      mockUseLocation.mockReturnValueOnce({ pathname: '/rules/create' });
      await act(async () => {
        const { result, waitForNextUpdate } = renderHook(() => useShowTimeline());
        await waitForNextUpdate();
        const showTimeline = result.current;
        expect(showTimeline).toEqual([false]);
      });
    });
    it('shows timeline for partial blacklist routes', async () => {
      mockUseLocation.mockReturnValueOnce({ pathname: '/rules' });
      await act(async () => {
        const { result, waitForNextUpdate } = renderHook(() => useShowTimeline());
        await waitForNextUpdate();
        const showTimeline = result.current;
        expect(showTimeline).toEqual([true]);
      });
    });
    it('hides timeline for sub blacklist routes', async () => {
      mockUseLocation.mockReturnValueOnce({ pathname: '/administration/policy' });
      await act(async () => {
        const { result, waitForNextUpdate } = renderHook(() => useShowTimeline());
        await waitForNextUpdate();
        const showTimeline = result.current;
        expect(showTimeline).toEqual([false]);
      });
    });
  });
});
