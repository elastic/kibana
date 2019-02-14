/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { InfraMetric } from '../../../graphql/types';
import { InfraFormatterType } from '../../../lib/lib';
import { nginxLayoutCreator } from './nginx';
import {
  InfraMetricLayoutCreator,
  InfraMetricLayoutSectionType,
  InfraMetricLayoutVisualizationType,
} from './types';

export const podLayoutCreator: InfraMetricLayoutCreator = theme => [
  {
    id: 'podOverview',
    label: i18n.translate('xpack.infra.metricDetailPage.podMetricsLayout.layoutLabel', {
      defaultMessage: 'Pod',
    }),
    sections: [
      {
        id: InfraMetric.podOverview,
        label: i18n.translate(
          'xpack.infra.metricDetailPage.podMetricsLayout.overviewSection.sectionLabel',
          {
            defaultMessage: 'Overview',
          }
        ),
        requires: ['kubernetes.pod'],
        type: InfraMetricLayoutSectionType.gauges,
        visConfig: {
          seriesOverrides: {
            cpu: {
              name: i18n.translate(
                'xpack.infra.metricDetailPage.podMetricsLayout.overviewSection.cpuUsageSeriesLabel',
                {
                  defaultMessage: 'CPU Usage',
                }
              ),
              color: theme.eui.euiColorFullShade,
              formatter: InfraFormatterType.percent,
              gaugeMax: 1,
            },
            memory: {
              name: i18n.translate(
                'xpack.infra.metricDetailPage.podMetricsLayout.overviewSection.memoryUsageSeriesLabel',
                {
                  defaultMessage: 'Memory Usage',
                }
              ),
              color: theme.eui.euiColorFullShade,
              formatter: InfraFormatterType.percent,
              gaugeMax: 1,
            },
            rx: {
              name: i18n.translate(
                'xpack.infra.metricDetailPage.podMetricsLayout.overviewSection.inboundRXSeriesLabel',
                {
                  defaultMessage: 'Inbound (RX)',
                }
              ),
              color: theme.eui.euiColorFullShade,
              formatter: InfraFormatterType.bits,
              formatterTemplate: '{{value}}/s',
            },
            tx: {
              name: i18n.translate(
                'xpack.infra.metricDetailPage.podMetricsLayout.overviewSection.outboundTXSeriesLabel',
                {
                  defaultMessage: 'Outbound (TX)',
                }
              ),
              color: theme.eui.euiColorFullShade,
              formatter: InfraFormatterType.bits,
              formatterTemplate: '{{value}}/s',
            },
          },
        },
      },
      {
        id: InfraMetric.podCpuUsage,
        label: i18n.translate(
          'xpack.infra.metricDetailPage.podMetricsLayout.cpuUsageSection.sectionLabel',
          {
            defaultMessage: 'CPU Usage',
          }
        ),
        requires: ['kubernetes.pod'],
        type: InfraMetricLayoutSectionType.chart,
        visConfig: {
          formatter: InfraFormatterType.percent,
          seriesOverrides: {
            cpu: { color: theme.eui.euiColorVis1, type: InfraMetricLayoutVisualizationType.area },
          },
        },
      },
      {
        id: InfraMetric.podMemoryUsage,
        label: i18n.translate(
          'xpack.infra.metricDetailPage.podMetricsLayout.memoryUsageSection.sectionLabel',
          {
            defaultMessage: 'Memory Usage',
          }
        ),
        requires: ['kubernetes.pod'],
        type: InfraMetricLayoutSectionType.chart,
        visConfig: {
          formatter: InfraFormatterType.percent,
          seriesOverrides: {
            memory: {
              color: theme.eui.euiColorVis1,
              type: InfraMetricLayoutVisualizationType.area,
            },
          },
        },
      },
      {
        id: InfraMetric.podNetworkTraffic,
        label: i18n.translate(
          'xpack.infra.metricDetailPage.podMetricsLayout.networkTrafficSection.sectionLabel',
          {
            defaultMessage: 'Network Traffic',
          }
        ),
        requires: ['kubernetes.pod'],
        type: InfraMetricLayoutSectionType.chart,
        visConfig: {
          formatter: InfraFormatterType.bits,
          formatterTemplate: '{{value}}/s',
          type: InfraMetricLayoutVisualizationType.area,
          seriesOverrides: {
            rx: {
              color: theme.eui.euiColorVis1,
              name: i18n.translate(
                'xpack.infra.metricDetailPage.podMetricsLayout.networkTrafficSection.networkRxRateSeriesLabel',
                {
                  defaultMessage: 'in',
                }
              ),
            },
            tx: {
              color: theme.eui.euiColorVis2,
              name: i18n.translate(
                'xpack.infra.metricDetailPage.podMetricsLayout.networkTrafficSection.networkTxRateSeriesLabel',
                {
                  defaultMessage: 'out',
                }
              ),
            },
          },
        },
      },
    ],
  },
  ...nginxLayoutCreator(theme),
];
