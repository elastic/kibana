/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { renderHook, act } from '@testing-library/react-hooks';
import type { DashboardAPI } from '@kbn/dashboard-plugin/public';

import { useDashboardRenderer } from './use_dashboard_renderer';
import { fetchTags } from '../../common/containers/tags/api';
import { MANAGED_TAG_NAME } from '../../../common/constants';

jest.mock('../../common/lib/kibana');
jest.mock('../../common/containers/tags/api');

const mockFetchTags = fetchTags as jest.Mock;
const mockDashboardContainer = { getExplicitInput: () => ({ tags: ['tagId'] }) } as DashboardAPI;

describe('useDashboardRenderer', () => {
  it('should set dashboard container and hasManagedTag correctly when dashboard is loaded', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useDashboardRenderer());

    await act(async () => {
      await result.current.handleDashboardLoaded(mockDashboardContainer);
      await waitForNextUpdate();
    });

    expect(result.current.dashboard.container).toEqual(mockDashboardContainer);
  });

  it('should set hasManagedTag to false when no managed tags are present', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useDashboardRenderer());

    await act(async () => {
      await result.current.handleDashboardLoaded(mockDashboardContainer);
      await waitForNextUpdate();
    });

    expect(result.current.dashboard.isManaged).toBe(false);
  });

  it('should set hasManagedTag to true when managed tags are present', async () => {
    mockFetchTags.mockImplementationOnce(({ tagIds }: { tagIds: string[] }) => {
      return Promise.resolve(tagIds.map((id) => ({ id, name: MANAGED_TAG_NAME })));
    });

    const { result, waitForNextUpdate } = renderHook(() => useDashboardRenderer());

    await act(async () => {
      await result.current.handleDashboardLoaded(mockDashboardContainer);
      await waitForNextUpdate();
    });
    expect(result.current.dashboard.isManaged).toBe(true);
  });
});
