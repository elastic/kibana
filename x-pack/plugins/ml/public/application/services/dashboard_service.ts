/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'kibana/public';
import { htmlIdGenerator } from '@elastic/eui';
import { useMemo } from 'react';
import {
  SavedDashboardPanel,
  SavedObjectDashboard,
} from '../../../../../../src/plugins/dashboard/public';
import { useMlKibana } from '../contexts/kibana';

export type DashboardService = ReturnType<typeof dashboardServiceProvider>;

export function dashboardServiceProvider(
  savedObjectClient: SavedObjectsClientContract,
  kibanaVersion: string
) {
  const generateId = htmlIdGenerator();
  return {
    /**
     * Fetches dashboards
     */
    async fetchDashboards(query?: string) {
      return await savedObjectClient.find<SavedObjectDashboard>({
        type: 'dashboard',
        perPage: 10,
        search: query ? `${query}*` : '',
        searchFields: ['title^3', 'description'],
      });
    },
    /**
     * Attaches embeddable panel to the dashboard
     */
    async attachPanel(
      dashboardId: string,
      dashboardAttributes: SavedObjectDashboard,
      panelData: Pick<SavedDashboardPanel, 'title' | 'type' | 'embeddableConfig'>
    ) {
      const panels = JSON.parse(dashboardAttributes.panelsJSON) as SavedDashboardPanel[];
      const panelIndex = generateId();
      const maxPanel = panels.reduce((prev, current) =>
        prev.gridData.y > current.gridData.y ? prev : current
      );
      const version = kibanaVersion;

      panels.push({
        panelIndex,
        embeddableConfig: panelData.embeddableConfig as { [key: string]: any },
        title: panelData.title,
        type: panelData.type,
        version,
        gridData: {
          h: 15,
          i: panelIndex,
          w: 24,
          x: 0,
          y: maxPanel ? maxPanel.gridData.y + maxPanel.gridData.h : 0,
        },
      });

      await savedObjectClient.update('dashboard', dashboardId, {
        ...dashboardAttributes,
        panelsJSON: JSON.stringify(panels),
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
      kibanaVersion,
    },
  } = useMlKibana();
  return useMemo(() => dashboardServiceProvider(savedObjectClient, kibanaVersion), [
    savedObjectClient,
    kibanaVersion,
  ]);
}
