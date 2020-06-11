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
import {
  ANOMALY_SWIMLANE_EMBEDDABLE_TYPE,
  getDefaultPanelTitle,
} from '../../embeddables/anomaly_swimlane/anomaly_swimlane_embeddable';
import { useMlKibana } from '../contexts/kibana';

export type DashboardService = ReturnType<typeof dashboardServiceProvider>;

export function dashboardServiceProvider(
  savedObjectClient: SavedObjectsClientContract,
  kibanaVersion: string
) {
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
      embeddableConfig: { [key: string]: any }
    ) {
      const panelData = JSON.parse(dashboardAttributes.panelsJSON) as SavedDashboardPanel[];
      const panelIndex = htmlIdGenerator()();

      const maxPanel = panelData.reduce((prev, current) =>
        prev.gridData.y > current.gridData.y ? prev : current
      );
      const version = kibanaVersion;

      panelData.push({
        panelIndex,
        embeddableConfig: embeddableConfig as { [key: string]: any },
        title: getDefaultPanelTitle(embeddableConfig.jobIds),
        type: ANOMALY_SWIMLANE_EMBEDDABLE_TYPE,
        version,
        gridData: {
          h: 15,
          i: panelIndex,
          w: 24,
          x: 0,
          y: maxPanel ? maxPanel.gridData.y + maxPanel.gridData.h + 10 : 0,
        },
      });

      await savedObjectClient.update('dashboard', dashboardId, {
        ...dashboardAttributes,
        panelsJSON: JSON.stringify(panelData),
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
