/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChartType, ChartTypeLensConfig } from '@kbn/lens-embeddable-utils/config_builder';
import type { HostFormulaNames } from '../formulas';
import { formulas } from '../formulas';

export const createBasicCharts = <T extends ChartType>({
  formulaIds,
  chartType,
  options,
}: {
  formulaIds: HostFormulaNames[];
  chartType: T;
  options?: Partial<ChartTypeLensConfig<T>>;
}): Record<HostFormulaNames, ChartTypeLensConfig<T>> => {
  return formulaIds.reduce((acc, curr) => {
    const chart =
      chartType === 'xy'
        ? ({
            ...options,
            chartType,
            layers: [
              {
                seriesType: 'line',
                type: 'series',
                xAxis: '@timestamp',
                value: formulas[curr],
              },
            ],
          } as ChartTypeLensConfig<'xy'>)
        : ({
            ...options,
            title: formulas[curr].label ?? '',
            value: formulas[curr],
            xAxis: '@timestamp',
            chartType,
          } as ChartTypeLensConfig<T>);

    return {
      ...acc,
      [curr]: chart,
    };
  }, {} as Record<HostFormulaNames, ChartTypeLensConfig<T>>);
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
