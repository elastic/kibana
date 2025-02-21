/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import type { DashboardPanelMap } from '@kbn/dashboard-plugin/common';
// Remove
// import {
//   AGENT_NAME_DASHBOARD_FILE_MAPPING,
//   loadDashboardFile,
// } from './dashboards/dashboard_catalog';

// Uncomment
// import { loadDashboardFile } from './dashboards/get_dashboard_file_name';
import { getDashboardFileName, loadDashboardFile } from './dashboards/get_dashboard_file_name';
interface DashboardFileProps {
  agentName?: string;
  runtimeName?: string;
  serverlessType?: string;
  telemetrySdkName?: string;
}

export interface MetricsDashboardProps extends DashboardFileProps {
  dataView: DataView;
}

export async function getDashboardFile(props: DashboardFileProps) {
  const dashboardFilename = getDashboardFileNameFromProps(props);
  const dashboardJSON = !!dashboardFilename ? await loadDashboardFile(dashboardFilename) : false;

  if (!dashboardFilename || !dashboardJSON) {
    return undefined;
  }
  return dashboardJSON;
}

export async function hasDashboardFile(props: DashboardFileProps) {
  const dashboardJSON = await getDashboardFile(props);
  return !!dashboardJSON;
}

// Remove
function getDashboardFileNameFromProps({ agentName, telemetrySdkName }: DashboardFileProps) {
  const dashboardFile = agentName && getDashboardFileName({ agentName, telemetrySdkName });
  return dashboardFile;
}

const getAdhocDataView = (dataView: DataView) => {
  return {
    [dataView.id!]: {
      ...dataView,
    },
  };
};

export async function convertSavedDashboardToPanels(
  props: MetricsDashboardProps,
  dataView: DataView
): Promise<DashboardPanelMap | undefined> {
  const dashboardJSON = await getDashboardFile(props);
  if (!dashboardJSON) {
    return undefined;
  }

  const panelsRawObjects = JSON.parse(dashboardJSON.attributes.panelsJSON) as any[];

  const panels = panelsRawObjects.reduce((acc, panel) => {
    const { gridData, embeddableConfig, panelIndex, title } = panel;
    const { attributes } = embeddableConfig;
    const { state } = attributes;
    const {
      datasourceStates: {
        formBased: { layers },
      },
    } = state;

    acc[gridData.i] = {
      type: panel.type,
      gridData,
      explicitInput: {
        id: panelIndex,
        ...embeddableConfig,
        title,
        attributes: {
          ...attributes,
          references: [],
          state: {
            ...state,
            adHocDataViews: getAdhocDataView(dataView),
            internalReferences: Object.keys(layers).map((layerId) => ({
              id: dataView.id,
              name: `indexpattern-datasource-layer-${layerId}`,
              type: 'index-pattern',
            })),
          },
        },
      },
    };

    return acc;
  }, {}) as DashboardPanelMap;

  return panels;
}
