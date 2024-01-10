/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type ChartModel,
  type XYChartModel,
  type MetricChartModel,
  type XYLayerOptions,
  type MetricLayerOptions,
  type ChartTypes,
  type XYVisualOptions,
  XY_ID,
} from '@kbn/lens-embeddable-utils';
import type { HostFormulaNames } from '../formulas';
import { formulas } from '../formulas';

type ChartByFormula<TType extends ChartTypes> = Record<
  HostFormulaNames,
  TType extends typeof XY_ID ? XYChartModel : MetricChartModel
>;

type BaseArgs<TType extends ChartTypes> = Pick<ChartModel, 'dataView'> & {
  formulaIds: HostFormulaNames[];
  visualizationType: TType;
  layerOptions?: TType extends typeof XY_ID ? XYLayerOptions : MetricLayerOptions;
  visualOptions?: TType extends typeof XY_ID ? XYVisualOptions : never;
};

export const createBasicCharts = <TType extends ChartTypes>({
  formulaIds,
  visualizationType,
  dataView,
  layerOptions,
  ...rest
}: BaseArgs<TType>): ChartByFormula<TType> => {
  return formulaIds.reduce((acc, curr) => {
    const layers = {
      data: visualizationType === XY_ID ? [formulas[curr]] : formulas[curr],
      layerType: visualizationType === XY_ID ? 'data' : 'metricTrendline',
      options: layerOptions,
    };

    const chartModel = {
      id: curr,
      title: formulas[curr].label,
      dataView,
      visualizationType,
      layers: visualizationType === XY_ID ? [layers] : layers,
      ...rest,
    } as TType extends typeof XY_ID ? XYChartModel : MetricChartModel;

    return {
      ...acc,
      [curr]: chartModel,
    };
  }, {} as ChartByFormula<TType>);
};

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
