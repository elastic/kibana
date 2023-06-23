/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dashboardServiceProvider } from './dashboard_service';
import { DashboardStart } from '@kbn/dashboard-plugin/public';

describe('DashboardService', () => {
  const dashboard: DashboardStart = {
    // @ts-expect-error Only partial mock of full plugin
    locator: {
      getUrl: jest.fn(),
    },
    findDashboardsService: jest.fn().mockResolvedValue({
      search: jest.fn().mockResolvedValue({
        total: 0,
        hits: [],
      }),
    }),
  };

  const dashboardService = dashboardServiceProvider(dashboard);

  test('should fetch dashboard', async () => {
    // act
    const resp = await dashboardService.fetchDashboards('test');
    // assert
    const searchDashboard = (await dashboard.findDashboardsService()).search;
    expect(searchDashboard).toHaveBeenCalledWith({
      search: 'test*',
      size: 1000,
    });
    expect(resp).toEqual([]);
  });
  test('should generate edit url to the dashboard', () => {
    dashboardService.getDashboardEditUrl('test-id');
    expect(dashboard.locator?.getUrl).toHaveBeenCalledWith({
      dashboardId: 'test-id',
      useHash: false,
      viewMode: 'edit',
    });
  });
});
