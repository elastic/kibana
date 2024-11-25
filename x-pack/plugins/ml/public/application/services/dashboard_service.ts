/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { DashboardStart } from '@kbn/dashboard-plugin/public';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import { useMlKibana } from '../contexts/kibana';

export type DashboardService = ReturnType<typeof dashboardServiceProvider>;
export type DashboardItems = Awaited<ReturnType<DashboardService['fetchDashboards']>>;

export function dashboardServiceProvider(dashboardService: DashboardStart) {
  return {
    /**
     * Fetches dashboards
     */
    async fetchDashboards(query?: string) {
      const findDashboardsService = await dashboardService.findDashboardsService();
      const responses = await findDashboardsService.search({
        search: query ? `${query}*` : '',
        size: 1000,
      });
      return responses.hits;
    },
    /**
     * Fetch dashboards by id
     */
    async fetchDashboardsById(ids: string[]) {
      const findDashboardsService = await dashboardService.findDashboardsService();
      const responses = await findDashboardsService.findByIds(ids);
      const existingDashboards = responses.filter(({ status }) => status === 'success');
      return existingDashboards;
    },
    /**
     * Generates dashboard url
     */
    async getDashboardUrl(dashboardId: string, viewMode: ViewMode = ViewMode.EDIT) {
      return await dashboardService.locator?.getUrl({
        dashboardId,
        viewMode: ViewMode.EDIT,
        useHash: false,
      });
    },
  };
}

/**
 * Hook to use {@link DashboardService} in react components
 */
export function useDashboardService(): DashboardService {
  const {
    services: { dashboard },
  } = useMlKibana();

  return useMemo(() => dashboardServiceProvider(dashboard), [dashboard]);
}
