/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import { Layer } from '../../../hooks/use_lens_attributes';
import { hostLensFormulas } from '../constants';
import { FormulaConfig } from '../types';
import { TOOLTIP } from './translations';
import { MetricLayerOptions } from './visualization_types/layers';

export interface KPIChartProps extends Pick<TypedLensByValueInput, 'id' | 'overrides' | 'style'> {
  layers: Layer<MetricLayerOptions, FormulaConfig, 'data'>;
  toolTip: string;
  'data-test-subj'?: string;
}

export const KPI_CHARTS: KPIChartProps[] = [
  {
    id: 'hostsViewKPIGridCpuUsageTile',
    layers: {
      data: {
        ...hostLensFormulas.cpuUsage,
        format: {
          ...hostLensFormulas.cpuUsage.format,
          params: {
            decimals: 1,
          },
        },
      },
      layerType: 'data',
      options: {
        backgroundColor: '#F1D86F',
        showTrendLine: true,
      },
    },
    toolTip: TOOLTIP.cpuUsage,
    'data-test-subj': 'hostsViewKPI-cpuUsage',
  },
  {
    id: 'hostsViewKPIGridNormalizedLoad1mTile',
    layers: {
      data: {
        ...hostLensFormulas.normalizedLoad1m,
        format: {
          ...hostLensFormulas.normalizedLoad1m.format,
          params: {
            decimals: 1,
          },
        },
      },
      layerType: 'data',
      options: {
        backgroundColor: '#79AAD9',
        showTrendLine: true,
      },
    },
    toolTip: TOOLTIP.normalizedLoad1m,
    'data-test-subj': 'hostsViewKPI-normalizedLoad1m',
  },
  {
    id: 'hostsViewKPIGridMemoryUsageTile',
    layers: {
      data: {
        ...hostLensFormulas.memoryUsage,
        format: {
          ...hostLensFormulas.memoryUsage.format,
          params: {
            decimals: 1,
          },
        },
      },
      layerType: 'data',
      options: {
        backgroundColor: '#A987D1',
        showTrendLine: true,
      },
    },
    toolTip: TOOLTIP.memoryUsage,
    'data-test-subj': 'hostsViewKPI-memoryUsage',
  },
  {
    id: 'hostsViewKPIGridDiskSpaceUsageTile',
    layers: {
      data: {
        ...hostLensFormulas.diskSpaceUsage,
        format: {
          ...hostLensFormulas.diskSpaceUsage.format,
          params: {
            decimals: 1,
          },
        },
      },
      layerType: 'data',
      options: {
        backgroundColor: '#F5A35C',
        showTrendLine: true,
      },
    },
    toolTip: TOOLTIP.diskSpaceUsage,
    'data-test-subj': 'hostsViewKPI-diskSpaceUsage',
  },
];
