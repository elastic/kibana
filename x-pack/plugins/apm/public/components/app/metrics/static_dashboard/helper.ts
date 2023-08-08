/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardPanelMap } from '@kbn/dashboard-plugin/common';
import { APM_STATIC_DATA_VIEW_ID } from '../../../../../common/data_view_constants';
import {
  AGENT_NAME_DASHBOARD_FILE_MAPPING,
  loadDashboardFile,
} from './dashboards/dashboard_catalog';

export interface MetricsDashboardProps {
  agentName?: string;
  runtimeName?: string;
  serverlessType?: string;
}

export function hasDashboardFile(props: MetricsDashboardProps) {
  return !!getDashboardFile(props);
}

function getDashboardFile({ agentName }: MetricsDashboardProps) {
  const dashboardFile =
    agentName && AGENT_NAME_DASHBOARD_FILE_MAPPING[agentName];
  return dashboardFile;
}

export async function getDashboardPanelMap(
  props: MetricsDashboardProps
): Promise<DashboardPanelMap | undefined> {
  const dashboardFile = getDashboardFile(props);
  const panelsRawObj = !!dashboardFile
    ? await loadDashboardFile(dashboardFile)
    : undefined;

  if (!dashboardFile || !panelsRawObj) {
    return undefined;
  }

  const panelsStr: string = (
    panelsRawObj.attributes.panelsJSON as string
  ).replaceAll('APM_STATIC_DATA_VIEW_ID', APM_STATIC_DATA_VIEW_ID);

  const panelsRawObjects = JSON.parse(panelsStr) as any[];

  return panelsRawObjects.reduce(
    (acc, panel) => ({
      ...acc,
      [panel.gridData.i]: {
        type: panel.type,
        gridData: panel.gridData,
        explicitInput: {
          id: panel.panelIndex,
          ...panel.embeddableConfig,
          title: panel.title,
        },
      },
    }),
    {}
  ) as DashboardPanelMap;
}
