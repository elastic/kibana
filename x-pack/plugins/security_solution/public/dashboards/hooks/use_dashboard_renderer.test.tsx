/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';

import { useDashboardRenderer } from './use_dashboard_renderer';

jest.mock('../../common/lib/kibana');

const mockDashboardContainer = {} as DashboardApi;

describe('useDashboardRenderer', () => {
  it('should set dashboard container correctly when dashboard is loaded', () => {
    const { result } = renderHook(() => useDashboardRenderer());

    act(() => {
      result.current.handleDashboardLoaded(mockDashboardContainer);
    });

    expect(result.current.dashboardContainer).toEqual(mockDashboardContainer);
  });
});
