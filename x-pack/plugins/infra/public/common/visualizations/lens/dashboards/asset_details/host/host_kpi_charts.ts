/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import { hostLensFormulas } from '../../../../constants';
import type { MetricChartLayerParams } from '../../../../types';
import { METRICS_TOOLTIP } from '../../translations';

export interface KPIChartProps extends Pick<TypedLensByValueInput, 'id' | 'title' | 'overrides'> {
  layers: MetricChartLayerParams;
  toolTip: string;
}

export const hostKPICharts: KPIChartProps[] = [
  {
    id: 'cpuUsage',
    title: i18n.translate('xpack.infra.assetDetailsEmbeddable.overview.kpi.cpuUsage.title', {
      defaultMessage: 'CPU Usage',
    }),
    layers: {
      data: {
        ...hostLensFormulas.cpuUsage,
        format: hostLensFormulas.cpuUsage.format
          ? {
              ...hostLensFormulas.cpuUsage.format,
              params: {
                decimals: 1,
              },
            }
          : undefined,
      },
      options: {
        backgroundColor: '#F1D86F',
        showTrendLine: true,
      },
      type: 'visualization',
    },
    toolTip: METRICS_TOOLTIP.cpuUsage,
  },
  {
    id: 'normalizedLoad1m',
    title: i18n.translate(
      'xpack.infra.assetDetailsEmbeddable.overview.kpi.normalizedLoad1m.title',
      {
        defaultMessage: 'Normalized Load',
      }
    ),
    layers: {
      data: {
        ...hostLensFormulas.normalizedLoad1m,
        format: hostLensFormulas.normalizedLoad1m.format
          ? {
              ...hostLensFormulas.normalizedLoad1m.format,
              params: {
                decimals: 1,
              },
            }
          : undefined,
      },
      options: {
        backgroundColor: '#79AAD9',
        showTrendLine: true,
      },
      type: 'visualization',
    },
    toolTip: METRICS_TOOLTIP.normalizedLoad1m,
  },
  {
    id: 'memoryUsage',
    title: i18n.translate('xpack.infra.assetDetailsEmbeddable.overview.kpi.memoryUsage.title', {
      defaultMessage: 'Memory Usage',
    }),
    layers: {
      data: {
        ...hostLensFormulas.memoryUsage,
        format: hostLensFormulas.memoryUsage.format
          ? {
              ...hostLensFormulas.memoryUsage.format,
              params: {
                decimals: 1,
              },
            }
          : undefined,
      },
      options: {
        backgroundColor: '#A987D1',
        showTrendLine: true,
      },
      type: 'visualization',
    },
    toolTip: METRICS_TOOLTIP.memoryUsage,
  },
  {
    id: 'diskSpaceUsage',
    title: i18n.translate('xpack.infra.assetDetailsEmbeddable.overview.kpi.diskSpaceUsage.title', {
      defaultMessage: 'Disk Space Usage',
    }),
    layers: {
      data: {
        ...hostLensFormulas.diskSpaceUsage,
        format: hostLensFormulas.diskSpaceUsage.format
          ? {
              ...hostLensFormulas.diskSpaceUsage.format,
              params: {
                decimals: 1,
              },
            }
          : undefined,
      },
      options: {
        backgroundColor: '#F5A35C',
        showTrendLine: true,
      },
      type: 'visualization',
    },
    toolTip: METRICS_TOOLTIP.diskSpaceUsage,
  },
];
