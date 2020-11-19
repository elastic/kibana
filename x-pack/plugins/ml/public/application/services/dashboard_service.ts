/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'kibana/public';
import { htmlIdGenerator } from '@elastic/eui';
import { useMemo } from 'react';
import {
  DASHBOARD_APP_URL_GENERATOR,
  DashboardUrlGenerator,
  SavedDashboardPanel,
  SavedObjectDashboard,
} from '../../../../../../src/plugins/dashboard/public';
import { useMlKibana } from '../contexts/kibana';
import { ViewMode } from '../../../../../../src/plugins/embeddable/public';

export type DashboardService = ReturnType<typeof dashboardServiceProvider>;

export function dashboardServiceProvider(
  savedObjectClient: SavedObjectsClientContract,
  kibanaVersion: string,
  dashboardUrlGenerator: DashboardUrlGenerator
) {
  const generateId = htmlIdGenerator();
  const DEFAULT_PANEL_WIDTH = 24;
  const DEFAULT_PANEL_HEIGHT = 15;

  return {
    /**
     * Fetches dashboards
     */
    async fetchDashboards(query?: string) {
      return await savedObjectClient.find<SavedObjectDashboard>({
        type: 'dashboard',
        perPage: 1000,
        search: query ? `${query}*` : '',
        searchFields: ['title^3', 'description'],
      });
    },
    /**
     * Resolves the last positioned panel from the collection.
     */
    getLastPanel(panels: SavedDashboardPanel[]): SavedDashboardPanel | null {
      return panels.length > 0
        ? panels.reduce((prev, current) =>
            prev.gridData.y >= current.gridData.y
              ? prev.gridData.y === current.gridData.y
                ? prev.gridData.x > current.gridData.x
                  ? prev
                  : current
                : prev
              : current
          )
        : null;
    },
    /**
     * Attaches embeddable panels to the dashboard
     */
    async attachPanels(
      dashboardId: string,
      dashboardAttributes: SavedObjectDashboard,
      panelsData: Array<Pick<SavedDashboardPanel, 'title' | 'type' | 'embeddableConfig'>>
    ) {
      const panels = JSON.parse(dashboardAttributes.panelsJSON) as SavedDashboardPanel[];
      const version = kibanaVersion;
      const rowWidth = DEFAULT_PANEL_WIDTH * 2;

      for (const panelData of panelsData) {
        const panelIndex = generateId();
        const lastPanel = this.getLastPanel(panels);

        const xOffset = lastPanel ? lastPanel.gridData.w + lastPanel.gridData.x : 0;
        const availableRowSpace = rowWidth - xOffset;
        const xPosition = availableRowSpace - DEFAULT_PANEL_WIDTH >= 0 ? xOffset : 0;

        panels.push({
          panelIndex,
          embeddableConfig: panelData.embeddableConfig as { [key: string]: any },
          title: panelData.title,
          type: panelData.type,
          version,
          gridData: {
            h: DEFAULT_PANEL_HEIGHT,
            i: panelIndex,
            w: DEFAULT_PANEL_WIDTH,
            x: xPosition,
            y: lastPanel
              ? xPosition > 0
                ? lastPanel.gridData.y
                : lastPanel.gridData.y + lastPanel.gridData.h
              : 0,
          },
        });
      }

      await savedObjectClient.update('dashboard', dashboardId, {
        ...dashboardAttributes,
        panelsJSON: JSON.stringify(panels),
      });
    },
    /**
     * Generates dashboard url with edit mode
     */
    async getDashboardEditUrl(dashboardId: string) {
      return await dashboardUrlGenerator.createUrl({
        dashboardId,
        useHash: false,
        viewMode: ViewMode.EDIT,
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
      share: { urlGenerators },
    },
  } = useMlKibana();
  return useMemo(
    () =>
      dashboardServiceProvider(
        savedObjectClient,
        kibanaVersion,
        urlGenerators.getUrlGenerator(DASHBOARD_APP_URL_GENERATOR)
      ),
    [savedObjectClient, kibanaVersion]
  );
}
