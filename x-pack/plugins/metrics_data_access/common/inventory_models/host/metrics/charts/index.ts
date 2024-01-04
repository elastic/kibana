/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChartType, ChartTypeLensConfig } from '@kbn/lens-embeddable-utils/config_builder';
import type { HostFormulaNames } from '../formulas';
import { formulas } from '../formulas';

type Args<T extends ChartType> = T extends 'xy'
  ? Omit<Partial<ChartTypeLensConfig<'xy'>>, 'layers' | 'title' | 'chartType'> & {
      layerConfig?: Partial<ChartTypeLensConfig<'xy'>['layers'][number]>;
    }
  : Omit<Partial<ChartTypeLensConfig<T>>, 'value' | 'title' | 'chartType'>;

type LensConfigWithId<T extends ChartType> = ChartTypeLensConfig<T> & { id: string };
export const createBasicCharts = <T extends ChartType>({
  chartType,
  formFormulas,
  chartConfig,
}: {
  chartType: T;
  formFormulas: HostFormulaNames[];
  chartConfig: Args<T>;
}): Record<HostFormulaNames, LensConfigWithId<T>> => {
  return formFormulas.reduce((acc, curr) => {
    if (chartType === 'xy') {
      const { layerConfig, ...rest } = chartConfig as Args<'xy'>;
      return {
        ...acc,
        [curr]: {
          ...chartConfig,
          chartType,
          title: formulas[curr].label ?? '',
          legend: {
            show: false,
            position: 'bottom',
            ...rest.legend,
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
              value: formulas[curr],
              ...layerConfig,
            },
          ],
        } as ChartTypeLensConfig<'xy'>,
      };
    } else {
      return {
        ...acc,
        [curr]: {
          ...chartConfig,
          chartType,
          title: formulas[curr].label ?? '',
          value: formulas[curr],
        } as ChartTypeLensConfig<T>,
      };
    }
  }, {} as Record<HostFormulaNames, LensConfigWithId<T>>);
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
