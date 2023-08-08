/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  hostLensFormulas,
  type FormulaConfig,
  type XYLayerOptions,
} from '../../../../../common/visualizations';
import type { LensChartProps } from '../../../../lens';
import type { Layer } from '../../../../../hooks/use_lens_attributes';

export type DataViewOrigin = 'logs' | 'metrics';

interface Props extends Pick<LensChartProps, 'id' | 'title' | 'overrides'> {
  layers: Array<Layer<XYLayerOptions, FormulaConfig[]>>;
  toolTip: string;
}

const PERCENT_LEFT_AXIS: Pick<Props, 'overrides'>['overrides'] = {
  axisLeft: {
    domain: {
      min: 0,
      max: 1,
    },
  },
};

const LEGEND_SETTINGS: Pick<Props, 'overrides'>['overrides'] = {
  settings: {
    showLegend: true,
    legendPosition: 'bottom',
    legendSize: 35,
  },
};

export const CHARTS_IN_ORDER: Array<
  Pick<Props, 'id' | 'title' | 'layers' | 'overrides'> & {
    dataViewOrigin: DataViewOrigin;
  }
> = [
  {
    id: 'cpuUsage',
    title: i18n.translate('xpack.infra.assetDetails.metricsCharts.cpuUsage', {
      defaultMessage: 'CPU Usage',
    }),

    layers: [
      {
        data: [hostLensFormulas.cpuUsage],
        layerType: 'data',
      },
    ],
    dataViewOrigin: 'metrics',
    overrides: {
      axisLeft: PERCENT_LEFT_AXIS.axisLeft,
    },
  },
  {
    id: 'memoryUsage',
    title: i18n.translate('xpack.infra.assetDetails.metricsCharts.memoryUsage', {
      defaultMessage: 'Memory Usage',
    }),
    layers: [
      {
        data: [hostLensFormulas.memoryUsage],
        layerType: 'data',
      },
    ],
    dataViewOrigin: 'metrics',
    overrides: {
      axisLeft: PERCENT_LEFT_AXIS.axisLeft,
    },
  },
  {
    id: 'normalizedLoad1m',
    title: i18n.translate('xpack.infra.assetDetails.metricsCharts.normalizedLoad1m', {
      defaultMessage: 'Normalized Load',
    }),
    layers: [
      {
        data: [hostLensFormulas.normalizedLoad1m],
        layerType: 'data',
      },
      {
        data: [
          {
            value: '1',
            format: {
              id: 'percent',
              params: {
                decimals: 0,
              },
            },
            color: '#6092c0',
          },
        ],
        layerType: 'referenceLine',
      },
    ],
    dataViewOrigin: 'metrics',
  },
  {
    id: 'logRate',
    title: i18n.translate('xpack.infra.assetDetails.metricsCharts.logRate', {
      defaultMessage: 'Log Rate',
    }),
    layers: [
      {
        data: [hostLensFormulas.logRate],
        layerType: 'data',
      },
    ],
    dataViewOrigin: 'logs',
  },
  {
    id: 'diskSpaceUsageAvailable',
    title: i18n.translate('xpack.infra.assetDetails.metricsCharts.diskSpace', {
      defaultMessage: 'Disk Space',
    }),
    layers: [
      {
        data: [
          {
            ...hostLensFormulas.diskSpaceUsage,
            label: i18n.translate('xpack.infra.assetDetails.metricsCharts.diskSpace.label.used', {
              defaultMessage: 'Used',
            }),
          },
          {
            ...hostLensFormulas.diskSpaceAvailable,
            label: i18n.translate(
              'xpack.infra.assetDetails.metricsCharts.diskSpace.label.available',
              {
                defaultMessage: 'Available',
              }
            ),
          },
        ],
        layerType: 'data',
        options: {
          seriesType: 'area',
        },
      },
    ],
    overrides: {
      axisRight: {
        style: {
          axisTitle: {
            visible: false,
          },
        },
      },
      axisLeft: PERCENT_LEFT_AXIS.axisLeft,
      settings: LEGEND_SETTINGS.settings,
    },
    dataViewOrigin: 'metrics',
  },
  {
    id: 'diskThroughputReadWrite',
    title: i18n.translate('xpack.infra.assetDetails.metricsCharts.diskIOPS', {
      defaultMessage: 'Disk IOPS',
    }),
    layers: [
      {
        data: [
          {
            ...hostLensFormulas.diskReadThroughput,
            label: i18n.translate('xpack.infra.assetDetails.metricsCharts.metric.label.read', {
              defaultMessage: 'Read',
            }),
          },
          {
            ...hostLensFormulas.diskWriteThroughput,
            label: i18n.translate('xpack.infra.assetDetails.metricsCharts.metric.label.write', {
              defaultMessage: 'Write',
            }),
          },
        ],
        layerType: 'data',
        options: {
          seriesType: 'area',
        },
      },
    ],
    overrides: {
      settings: LEGEND_SETTINGS.settings,
    },
    dataViewOrigin: 'metrics',
  },
  {
    id: 'diskIOReadWrite',
    title: i18n.translate('xpack.infra.assetDetails.metricsCharts.diskThroughput', {
      defaultMessage: 'Disk Throughput',
    }),
    layers: [
      {
        data: [
          {
            ...hostLensFormulas.diskIORead,
            label: i18n.translate('xpack.infra.assetDetails.metricsCharts.metric.label.read', {
              defaultMessage: 'Read',
            }),
          },
          {
            ...hostLensFormulas.diskIOWrite,
            label: i18n.translate('xpack.infra.assetDetails.metricsCharts.metric.label.write', {
              defaultMessage: 'Write',
            }),
          },
        ],
        layerType: 'data',
        options: {
          seriesType: 'area',
        },
      },
    ],
    overrides: {
      settings: LEGEND_SETTINGS.settings,
    },
    dataViewOrigin: 'metrics',
  },
  {
    id: 'rxTx',
    title: i18n.translate('xpack.infra.assetDetails.metricsCharts.network', {
      defaultMessage: 'Network',
    }),
    layers: [
      {
        data: [
          {
            ...hostLensFormulas.rx,
            label: i18n.translate('xpack.infra.assetDetails.metricsCharts.network.label.rx', {
              defaultMessage: 'Inbound (RX)',
            }),
          },
          {
            ...hostLensFormulas.tx,
            label: i18n.translate('xpack.infra.assetDetails.metricsCharts.network.label.tx', {
              defaultMessage: 'Outbound (TX)',
            }),
          },
        ],
        layerType: 'data',
        options: {
          seriesType: 'area',
        },
      },
    ],
    overrides: {
      settings: LEGEND_SETTINGS.settings,
    },
    dataViewOrigin: 'metrics',
  },
];
