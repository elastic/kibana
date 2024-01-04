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
  ? Omit<Partial<ChartTypeLensConfig<'xy'>>, 'layers'> & {
      layerConfig?: Partial<ChartTypeLensConfig<'xy'>['layers'][number]>;
    }
  : Omit<Partial<ChartTypeLensConfig<T>>, 'value' | 'title'>;

export const createBasicCharts = <T extends ChartType>({
  formFormulas,
  chartConfig,
}: {
  formFormulas: HostFormulaNames[];
  chartConfig: Args<T>;
}): Record<HostFormulaNames, ChartTypeLensConfig<T> & { id: string }> => {
  return formFormulas.reduce((acc, curr) => {
    const chart =
      chartConfig.chartType === 'xy'
        ? ({
            ...chartConfig,
            id: curr,
            title: formulas[curr].label ?? '',
            legend: {
              show: false,
              position: 'bottom',
              ...chartConfig.legend,
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
                ...chartConfig.layerConfig,
              },
            ],
          } as ChartTypeLensConfig<'xy'>)
        : {
            ...chartConfig,
            id: curr,
            title: formulas[curr].label ?? '',
            value: formulas[curr],
          };

    return {
      ...acc,
      [curr]: chart,
    };
  }, {} as Record<HostFormulaNames, ChartTypeLensConfig<T> & { id: HostFormulaNames }>);
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
