/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataView } from '@kbn/data-views-plugin/common';
import {
  type ChartModel,
  type XYLayerModel,
  type MetricsLayerModel,
  type XYLayerOptions,
  type MetricLayerOptions,
  type ChartTypes,
  type XYChartModel,
  XY_ID,
  LayerModel,
} from '@kbn/lens-embeddable-utils';

import { formulas } from '../formulas';

type ChartByFormula<TLayer extends LayerModel> = Record<keyof typeof formulas, ChartModel<TLayer>>;

interface CreateBasicChartBase<TType extends ChartTypes> {
  formulaIds: Array<keyof typeof formulas>;
  dataView: DataView;
  visualizationType: TType;
  extra?: {
    options?: TType extends typeof XY_ID ? XYLayerOptions : MetricLayerOptions;
  };
}

type CreateBasicChartArgs<TType extends ChartTypes> = (TType extends typeof XY_ID
  ? Pick<XYChartModel, 'visualOptions'>
  : {}) &
  CreateBasicChartBase<TType>;

export const createBasicCharts = <
  TType extends ChartTypes,
  TReturn extends TType extends typeof XY_ID ? XYLayerModel : MetricsLayerModel
>({
  formulaIds,
  visualizationType,
  extra,
  dataView,
  ...rest
}: CreateBasicChartArgs<TType>): ChartByFormula<TReturn> =>
  formulaIds.reduce((acc, curr) => {
    return {
      ...acc,
      [curr]: {
        id: curr,
        title: formulas[curr].label,
        dataView,
        visualizationType,
        ...(visualizationType === XY_ID
          ? {
              layers: [
                {
                  data: [formulas[curr]],
                  layerType: 'data',
                  options: extra?.options,
                },
              ],
              ...rest,
            }
          : {
              layers: {
                data: formulas[curr],
                layerType: 'metricTrendline',
                options: extra?.options,
              },
            }),
      } as ChartModel<TReturn>,
    };
  }, {} as ChartByFormula<TReturn>);

// custom charts
export { cpuUsageBreakdown, normalizedLoad1m, loadBreakdown } from './cpu_charts';
export {
  diskIOReadWrite,
  diskSpaceUsageAvailable,
  diskThroughputReadWrite,
  diskUsageByMountPoint,
} from './disk_charts';
export { memoryUsageBreakdown } from './memory_charts';
export { rxTx } from './network_charts';
