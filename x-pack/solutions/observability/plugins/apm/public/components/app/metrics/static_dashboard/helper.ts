/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import type { DashboardState } from '@kbn/dashboard-plugin/common';
import { existingDashboardFileNames, loadDashboardFile } from './dashboards/dashboard_catalog';
import { getDashboardFileName } from './dashboards/get_dashboard_file_name';
interface DashboardFileProps {
  agentName?: string;
  runtimeName?: string;
  serverlessType?: string;
  telemetrySdkName?: string;
  telemetrySdkLanguage?: string;
}

export interface MetricsDashboardProps extends DashboardFileProps {
  dataView: DataView;
}

function getDashboardFileNameFromProps({
  agentName,
  telemetrySdkName,
  telemetrySdkLanguage,
}: DashboardFileProps) {
  const dashboardFile =
    agentName && getDashboardFileName({ agentName, telemetrySdkName, telemetrySdkLanguage });
  return dashboardFile;
}

export function hasDashboard(props: DashboardFileProps) {
  const dashboardFilename = getDashboardFileNameFromProps(props);
  return !!dashboardFilename && existingDashboardFileNames.has(dashboardFilename);
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
): Promise<DashboardState['panels'] | undefined> {
  const dashboardFilename = getDashboardFileNameFromProps(props);
  const dashboardJSON = !!dashboardFilename ? await loadDashboardFile(dashboardFilename) : false;

  if (!dashboardFilename || !dashboardJSON) {
    return undefined;
  }

  const panelsRawObjects = JSON.parse(dashboardJSON.attributes.panelsJSON) as any[];

  const panels = panelsRawObjects.reduce((acc, panel) => {
    const { gridData, embeddableConfig, panelIndex, title } = panel;
    const { attributes } = embeddableConfig;
    const datasourceStates = attributes?.state?.datasourceStates ?? {};
    const layers = datasourceStates.formBased?.layers ?? datasourceStates.textBased?.layers ?? [];

    acc.push({
      type: panel.type,
      grid: gridData,
      uid: panelIndex,
      config: {
        id: panelIndex,
        ...embeddableConfig,
        title,
        attributes: {
          ...attributes,
          references: [],
          state: {
            ...(attributes?.state ?? {}),
            adHocDataViews: getAdhocDataView(dataView),
            internalReferences: Object.keys(layers).map((layerId) => ({
              id: dataView.id,
              name: `indexpattern-datasource-layer-${layerId}`,
              type: 'index-pattern',
            })),
          },
        },
      },
    });

    return acc;
  }, []);

  return panels;
}
