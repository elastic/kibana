/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback } from 'react';

import { EuiFlexGrid, EuiFlexItem, EuiTitle, EuiSpacer, EuiFlexGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { TimeRange } from '@kbn/es-query';
import { FormattedMessage } from '@kbn/i18n-react';
import type { XYVisualOptions } from '@kbn/lens-embeddable-utils';
import { UseLensAttributesXYLayerConfig } from '../../../../../hooks/use_lens_attributes';
import { buildCombinedHostsFilter } from '../../../../../utils/filters/build';
import { LensChart, type LensChartProps, HostMetricsExplanationContent } from '../../../../lens';
import { hostLensFormulas } from '../../../../../common/visualizations';
import { METRIC_CHART_HEIGHT } from '../../../constants';
import { Popover } from '../../common/popover';

type DataViewOrigin = 'logs' | 'metrics';
interface MetricChartConfig extends Pick<LensChartProps, 'id' | 'title' | 'overrides'> {
  layers: UseLensAttributesXYLayerConfig;
  toolTip: string;
}

const PERCENT_LEFT_AXIS: Pick<MetricChartConfig, 'overrides'>['overrides'] = {
  axisLeft: {
    domain: {
      min: 0,
      max: 1,
    },
  },
};

const LEGEND_SETTINGS: Pick<MetricChartConfig, 'overrides'>['overrides'] = {
  settings: {
    showLegend: true,
    legendPosition: 'bottom',
    legendSize: 35,
  },
};

const XY_VISUAL_OPTIONS: XYVisualOptions = {
  showDottedLine: true,
  missingValues: 'Linear',
};

const CHARTS_IN_ORDER: Array<
  Pick<MetricChartConfig, 'id' | 'title' | 'layers' | 'overrides'> & {
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
            ...hostLensFormulas.diskSpaceAvailability,
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
    id: 'diskIOReadWrite',
    title: i18n.translate('xpack.infra.assetDetails.metricsCharts.diskThroughput', {
      defaultMessage: 'Disk Throughput',
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

export interface MetricsGridProps {
  nodeName: string;
  timeRange: TimeRange;
  metricsDataView?: DataView;
  logsDataView?: DataView;
}

export interface MetricsGridProps {
  nodeName: string;
  timeRange: TimeRange;
  metricsDataView?: DataView;
  logsDataView?: DataView;
}

export const MetricsGrid = React.memo(
  ({ nodeName, metricsDataView, logsDataView, timeRange }: MetricsGridProps) => {
    const getDataView = useCallback(
      (dataViewOrigin: DataViewOrigin) => {
        return dataViewOrigin === 'metrics' ? metricsDataView : logsDataView;
      },
      [logsDataView, metricsDataView]
    );

    const getFilters = useCallback(
      (dataViewOrigin: DataViewOrigin) => {
        return [
          buildCombinedHostsFilter({
            field: 'host.name',
            values: [nodeName],
            dataView: getDataView(dataViewOrigin),
          }),
        ];
      },
      [getDataView, nodeName]
    );

    return (
      <EuiFlexGroup gutterSize="m" direction="column">
        <EuiFlexItem grow={false}>
          <MetricsSectionTitle />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiSpacer size="s" />
          <EuiFlexGrid
            columns={2}
            gutterSize="s"
            data-test-subj="infraAssetDetailsMetricsChartGrid"
          >
            {CHARTS_IN_ORDER.map(({ dataViewOrigin, id, layers, title, overrides }, index) => (
              <EuiFlexItem key={index} grow={false}>
                <LensChart
                  id={`infraAssetDetailsMetricsChart${id}`}
                  borderRadius="m"
                  dataView={getDataView(dataViewOrigin)}
                  dateRange={timeRange}
                  height={METRIC_CHART_HEIGHT}
                  visualOptions={XY_VISUAL_OPTIONS}
                  layers={layers}
                  filters={getFilters(dataViewOrigin)}
                  title={title}
                  overrides={overrides}
                  visualizationType="lnsXY"
                  disableTriggers
                />
              </EuiFlexItem>
            ))}
          </EuiFlexGrid>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

const MetricsSectionTitle = () => {
  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center">
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
        <Popover icon="questionInCircle" data-test-subj="infraAssetDetailsMetricsPopoverButton">
          <HostMetricsExplanationContent />
        </Popover>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
