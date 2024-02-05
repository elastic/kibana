/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChartType, ChartTypeLensConfig } from '@kbn/lens-embeddable-utils/config_builder';
import { LensConfigWithId } from '../../../types';
import type { HostFormulaNames } from '../formulas';
import { formulas } from '../formulas';

type CustomLensConfig<T extends ChartType> = { id: string } & ChartTypeLensConfig<T>;

type Args<T extends ChartType> = T extends 'xy'
  ? Omit<Partial<ChartTypeLensConfig<'xy'>>, 'layers' | 'chartType' | 'dataset'> & {
      layerConfig?: Partial<ChartTypeLensConfig<'xy'>['layers'][number]>;
    }
  : Omit<Partial<ChartTypeLensConfig<T>>, 'value' | 'chartType' | 'dataset'>;

export const createBasicCharts = <T extends ChartType>({
  chartType,
  fromFormulas,
  chartConfig,
  dataViewId,
}: {
  chartType: T;
  fromFormulas: HostFormulaNames[];
  chartConfig?: Args<T>;
  dataViewId?: string;
}): Record<HostFormulaNames, CustomLensConfig<T>> => {
  return fromFormulas.reduce((acc, curr) => {
    const baseConfig = {
      ...chartConfig,
      id: curr,
      title: formulas[curr].label ?? chartConfig?.title ?? '',
      ...(dataViewId
        ? {
            dataset: {
              index: dataViewId,
            },
          }
        : {}),
    } as LensConfigWithId;

    if (chartType === 'xy') {
      const {
        layerConfig,
        legend,
        fittingFunction = 'Linear',
        ...xyConfig
      } = baseConfig as Args<'xy'>;
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
          fittingFunction,
          layers: [
            {
              seriesType: 'line',
              type: 'series',
              xAxis: '@timestamp',
              yAxis: [formulas[curr]],
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
export { cpuUsageBreakdown } from './cpu_charts';
export { loadBreakdown } from './load_charts';
export {
  diskIOReadWrite,
  diskSpaceUsageAvailable,
  diskThroughputReadWrite,
  diskUsageByMountPoint,
} from './disk_charts';
export { memoryUsageBreakdown } from './memory_charts';
export { rxTx } from './network_charts';
