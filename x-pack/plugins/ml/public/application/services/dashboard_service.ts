/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from 'kibana/public';
import { useMemo } from 'react';
import {
  DashboardSavedObject,
  DashboardAppLocator,
} from '../../../../../../src/plugins/dashboard/public';
import { useMlKibana } from '../contexts/kibana';
import { ViewMode } from '../../../../../../src/plugins/embeddable/public';

export type DashboardService = ReturnType<typeof dashboardServiceProvider>;

export function dashboardServiceProvider(
  savedObjectClient: SavedObjectsClientContract,
  dashboardLocator: DashboardAppLocator
) {
  return {
    /**
     * Fetches dashboards
     */
    async fetchDashboards(query?: string) {
      return await savedObjectClient.find<DashboardSavedObject>({
        type: 'dashboard',
        perPage: 1000,
        search: query ? `${query}*` : '',
        searchFields: ['title^3', 'description'],
      });
    },
    /**
     * Generates dashboard url with edit mode
     */
    async getDashboardEditUrl(dashboardId: string) {
      return await dashboardLocator.getUrl({
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
    services: {
      savedObjects: { client: savedObjectClient },
      dashboard: { locator: dashboardLocator },
    },
  } = useMlKibana();

  return useMemo(
    () => dashboardServiceProvider(savedObjectClient, dashboardLocator!),
    [savedObjectClient, dashboardLocator]
  );
}
