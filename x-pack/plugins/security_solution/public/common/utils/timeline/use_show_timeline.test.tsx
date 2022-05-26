/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { coreMock } from '@kbn/core/public/mocks';
import { allowedExperimentalValues } from '../../../../common/experimental_features';
import { updateAppLinks } from '../../links';
import { getAppLinks } from '../../links/app_links';
import { useShowTimeline } from './use_show_timeline';
import { StartPlugins } from '../../../types';

const mockUseLocation = jest.fn().mockReturnValue({ pathname: '/overview' });
jest.mock('react-router-dom', () => {
  const original = jest.requireActual('react-router-dom');
  return {
    ...original,
    useLocation: () => mockUseLocation(),
  };
});

const mockUseSourcererDataView = jest.fn(
  (): { indicesExist: boolean; dataViewId: string | null } => ({
    indicesExist: true,
    dataViewId: null,
  })
);
jest.mock('../../containers/sourcerer', () => ({
  useSourcererDataView: () => mockUseSourcererDataView(),
}));
const mockedUseIsGroupedNavigationEnabled = jest.fn();

jest.mock('../../components/navigation/helpers', () => ({
  useIsGroupedNavigationEnabled: () => mockedUseIsGroupedNavigationEnabled(),
}));

describe('use show timeline', () => {
  beforeAll(async () => {
    // initialize all App links before running test
    const appLinks = await getAppLinks(coreMock.createStart(), {} as StartPlugins);
    updateAppLinks(appLinks, {
      experimentalFeatures: allowedExperimentalValues,
      capabilities: {
        navLinks: {},
        management: {},
        catalogue: {},
        actions: { show: true, crud: true },
        siem: {
          show: true,
          crud: true,
        },
      },
    });
  });
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

  describe('sourcererDataView', () => {
    it('should show timeline when indices exist', () => {
      mockUseSourcererDataView.mockReturnValueOnce({ indicesExist: true, dataViewId: 'test' });
      const { result } = renderHook(() => useShowTimeline());
      expect(result.current).toEqual([true]);
    });

    it('should show timeline when dataViewId is null', () => {
      mockUseSourcererDataView.mockReturnValueOnce({ indicesExist: false, dataViewId: null });
      const { result } = renderHook(() => useShowTimeline());
      expect(result.current).toEqual([true]);
    });

    it('should not show timeline when dataViewId is not null and indices does not exist', () => {
      mockUseSourcererDataView.mockReturnValueOnce({ indicesExist: false, dataViewId: 'test' });
      const { result } = renderHook(() => useShowTimeline());
      expect(result.current).toEqual([false]);
    });
  });
});
