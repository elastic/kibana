/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Filter, Query } from '@kbn/es-query';
import type { IconType } from '@elastic/eui/src/components/icon/icon';
import type { DataView, DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { getActiveDatasourceIdFromDoc } from './utils';
import type { EditorFrameService as EditorFrameServiceType } from './editor_frame_service';
import type { OperationDescriptor } from './types';
import type { LensSavedObjectAttributes } from '.';

export type ChartInfoApi = Promise<{
  getChartInfo: (vis: LensSavedObjectAttributes) => Promise<ChartInfo | undefined>;
}>;

export interface ChartInfo {
  layers: ChartLayerDescriptor[];
  visualizationType: string;
  filters: Filter[];
  query: Query;
}

export interface ChartLayerDescriptor {
  dataView?: DataView;
  layerId: string;
  layerType: string;
  chartType?: string;
  icon?: IconType;
  label?: string;
  dimensions: Array<{
    name: string;
    id: string;
    role: 'split' | 'metric';
    dimensionType: string;
    operation: OperationDescriptor & { type: string; fields?: string[]; filter?: Query };
  }>;
}

export const createChartInfoApi = async (
  dataViews: DataViewsPublicPluginStart,
  editorFrameService?: EditorFrameServiceType
): ChartInfoApi => {
  const [visualizationMap, datasourceMap] = await Promise.all([
    editorFrameService!.loadVisualizations(),
    editorFrameService!.loadDatasources(),
  ]);
  return {
    async getChartInfo(vis: LensSavedObjectAttributes): Promise<ChartInfo | undefined> {
      const lensVis = vis;
      const activeDatasourceId = getActiveDatasourceIdFromDoc(lensVis);
      if (!activeDatasourceId || !lensVis?.visualizationType) {
        return undefined;
      }

      const docDatasourceState = lensVis?.state.datasourceStates[activeDatasourceId];
      const dataSourceInfo = await datasourceMap[activeDatasourceId].getDatasourceInfo(
        docDatasourceState,
        lensVis?.references,
        dataViews
      );
      const chartInfo = visualizationMap[lensVis.visualizationType].getVisualizationInfo?.(
        lensVis?.state.visualization
      );

      const layers = chartInfo?.layers.map((l) => {
        const dataSource = dataSourceInfo.find((info) => info.layerId === l.layerId);
        const updatedDimensions = l.dimensions.map((d) => {
          return {
            ...d,
            ...dataSource?.columns.find((c) => c.id === d.id)!,
          };
        });
        return {
          ...l,
          dataView: dataSource?.dataView,
          dimensions: updatedDimensions,
        };
      });
      return layers
        ? {
            layers,
            visualizationType: lensVis.visualizationType,
            filters: lensVis.state.filters,
            query: lensVis.state.query,
          }
        : undefined;
    },
  };
};
