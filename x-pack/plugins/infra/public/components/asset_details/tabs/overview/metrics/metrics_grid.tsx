/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import { EuiFlexGrid, EuiFlexItem, EuiTitle, EuiSpacer, EuiFlexGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DataView } from '@kbn/data-views-plugin/public';
import { TimeRange } from '@kbn/es-query';
import { FormattedMessage } from '@kbn/i18n-react';
import { HostMetricsDocsLink } from '../../../../lens';
import { MetricChart, type MetricChartProps } from './metric_chart';
import { hostLensFormulas } from '../../../../../common/visualizations';

const PERCENT_LEFT_AXIS: Pick<MetricChartProps, 'overrides'>['overrides'] = {
  axisLeft: {
    domain: {
      min: 0,
      max: 1,
    },
  },
};

const LEGEND_SETTINGS: Pick<MetricChartProps, 'overrides'>['overrides'] = {
  settings: {
    showLegend: true,
    legendPosition: 'bottom',
    legendSize: 35,
  },
};

const CHARTS_IN_ORDER: Array<
  Pick<MetricChartProps, 'id' | 'title' | 'layers' | 'overrides'> & {
    dataViewType: 'logs' | 'metrics';
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
    dataViewType: 'metrics',
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
    dataViewType: 'metrics',
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
    dataViewType: 'metrics',
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
    dataViewType: 'logs',
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
    dataViewType: 'metrics',
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
    dataViewType: 'metrics',
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
    dataViewType: 'metrics',
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
    dataViewType: 'metrics',
  },
];

export interface MetricsGridProps {
  nodeName: string;
  timeRange: TimeRange;
  metricsDataView?: DataView;
  logsDataView?: DataView;
}

export const MetricsGrid = React.memo(
  ({ nodeName, metricsDataView, logsDataView, timeRange }: MetricsGridProps) => {
    return (
      <EuiFlexGroup gutterSize="m" direction="column">
        <EuiFlexItem grow={false}>
          <EuiTitle size="xxs">
            <h5>
              <FormattedMessage
                id="xpack.infra.assetDetails.overview.metricsSectionTitle"
                defaultMessage="Metrics"
              />
            </h5>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <HostMetricsDocsLink />
          <EuiSpacer size="s" />
          <EuiFlexGrid
            columns={2}
            gutterSize="s"
            data-test-subj="infraAssetDetailsMetricsChartGrid"
          >
            {CHARTS_IN_ORDER.map(({ dataViewType, ...chartProp }, index) => (
              <EuiFlexItem key={index} grow={false}>
                <MetricChart
                  nodeName={nodeName}
                  dataView={dataViewType === 'metrics' ? metricsDataView : logsDataView}
                  timeRange={timeRange}
                  {...chartProp}
                />
              </EuiFlexItem>
            ))}
          </EuiFlexGrid>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);
