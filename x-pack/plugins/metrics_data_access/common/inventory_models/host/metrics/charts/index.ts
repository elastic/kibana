/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChartType, ChartTypeLensConfig } from '@kbn/lens-embeddable-utils/config_builder';
import { LensConfigWithId } from '../../../types';
import type { HostFormulaNames } from '../formulas';
import { formulas } from '../formulas';

type CustomLensConfig<T extends ChartType> = { id: string } & ChartTypeLensConfig<T>;

type Args<T extends ChartType> = T extends 'xy'
  ? Omit<Partial<ChartTypeLensConfig<'xy'>>, 'layers' | 'chartType'> & {
      layerConfig?: Partial<ChartTypeLensConfig<'xy'>['layers'][number]>;
    }
  : Omit<Partial<ChartTypeLensConfig<T>>, 'value' | 'chartType'>;

export const createBasicCharts = <T extends ChartType>({
  chartType,
  formFormulas,
  chartConfig,
}: {
  chartType: T;
  formFormulas: HostFormulaNames[];
  chartConfig: Args<T>;
}): Record<HostFormulaNames, CustomLensConfig<T>> => {
  return formFormulas.reduce((acc, curr) => {
    const baseConfig = {
      ...chartConfig,
      id: curr,
      title: formulas[curr].label ?? chartConfig.title ?? '',
    } as LensConfigWithId;

    if (chartType === 'xy') {
      const { layerConfig, legend, ...xyConfig } = baseConfig as Args<'xy'>;
      return {
        ...acc,
        [curr]: {
          ...xyConfig,
          chartType,
          legend: {
            show: false,
            position: 'bottom',
            ...legend,
          },
          axisTitleVisibility: {
            showXAxisTitle: false,
            showYAxisTitle: false,
          },
          layers: [
            {
              seriesType: 'line',
              type: 'series',
              xAxis: '@timestamp',
              ...formulas[curr],
              ...layerConfig,
            },
          ],
        } as CustomLensConfig<'xy'>,
      };
    }

    return {
      ...acc,
      [curr]: {
        ...baseConfig,
        ...formulas[curr],
        chartType,
      },
    };
  }, {} as Record<HostFormulaNames, CustomLensConfig<T>>);
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
