/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { allowedExperimentalValues } from '../../../../common/experimental_features';
import { UpsellingService } from '@kbn/security-solution-upselling/service';
import { updateAppLinks } from '../../links';
import { appLinks } from '../../../app_links';
import { useShowTimeline } from './use_show_timeline';

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

const mockSiemUserCanRead = jest.fn(() => true);
jest.mock('../../lib/kibana', () => {
  const original = jest.requireActual('../../lib/kibana');

  return {
    ...original,
    useKibana: () => ({
      services: {
        ...original.useKibana().services,
        application: {
          capabilities: {
            siem: {
              show: mockSiemUserCanRead(),
            },
          },
        },
      },
    }),
  };
});

const mockUpselling = new UpsellingService();

describe('use show timeline', () => {
  beforeAll(() => {
    // initialize all App links before running test
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
      upselling: mockUpselling,
    });
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
    mockUseLocation.mockReturnValueOnce({ pathname: '/rules/add_rules' });
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

describe('Security solution capabilities', () => {
  it('should show timeline when user has read capabilities', () => {
    mockSiemUserCanRead.mockReturnValueOnce(true);
    const { result } = renderHook(() => useShowTimeline());
    expect(result.current).toEqual([true]);
  });

  it('should not show timeline when user does not have read capabilities', () => {
    mockSiemUserCanRead.mockReturnValueOnce(false);
    const { result } = renderHook(() => useShowTimeline());
    expect(result.current).toEqual([false]);
  });
});
