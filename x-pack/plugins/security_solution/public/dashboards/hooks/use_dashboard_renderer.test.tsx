/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import type { DashboardAPI } from '@kbn/dashboard-plugin/public';

import { useDashboardRenderer } from './use_dashboard_renderer';

jest.mock('../../common/lib/kibana');

const mockDashboardContainer = { getExplicitInput: () => ({ tags: ['tagId'] }) } as DashboardAPI;

describe('useDashboardRenderer', () => {
  it('should set dashboard container correctly when dashboard is loaded', async () => {
    const { result } = renderHook(() => useDashboardRenderer());

    await act(async () => {
      await result.current.handleDashboardLoaded(mockDashboardContainer);
    });

    expect(result.current.dashboardContainer).toEqual(mockDashboardContainer);
  });
});
