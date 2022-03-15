/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dashboardServiceProvider } from './dashboard_service';
import { savedObjectsServiceMock } from '../../../../../../src/core/public/mocks';
import type { DashboardAppLocator } from '../../../../../../src/plugins/dashboard/public';

describe('DashboardService', () => {
  const mockSavedObjectClient = savedObjectsServiceMock.createStartContract().client;
  const dashboardLocator = {
    getUrl: jest.fn(),
  } as unknown as DashboardAppLocator;
  const dashboardService = dashboardServiceProvider(mockSavedObjectClient, dashboardLocator);

  test('should fetch dashboard', () => {
    // act
    dashboardService.fetchDashboards('test');
    // assert
    expect(mockSavedObjectClient.find).toHaveBeenCalledWith({
      type: 'dashboard',
      perPage: 1000,
      search: `test*`,
      searchFields: ['title^3', 'description'],
    });
  });

  test('should generate edit url to the dashboard', () => {
    dashboardService.getDashboardEditUrl('test-id');
    expect(dashboardLocator.getUrl).toHaveBeenCalledWith({
      dashboardId: 'test-id',
      useHash: false,
      viewMode: 'edit',
    });
  });
});
